const fs = require('fs')
const path = require('path')
const Watchpack = require('watchpack')
const clearModule = require('clear-module')
const glob = require('glob')

const { PLUGIN_NAME } = require('./constants')
const { GenError, toFunc, isPlainObject, createCacheFlagsPath } = require('./utils')

function validateOptions (options) {
  let { namespace, watch, ignoreFiles, flags } = options || {}
  if (typeof namespace !== 'string') {
    throw GenError('"namespace" must be string')
  }
  try {
    if (namespace !== namespace.trim()) { throw new Error() }
    toFunc(`var ${namespace}={}; return ${namespace}.foo`, false)()
  } catch (err) {
    throw GenError(`namespace ${JSON.stringify(namespace)} is not a valid or available variable name`)
  }
  if (typeof watch === 'string') {
    watch = [watch]
  }
  if (Array.isArray(watch) && !watch.every(v => typeof v === 'string')) {
    throw new GenError('"watch" must be boolean or array includes files to be watched.')
  }
  if (isPlainObject(flags)) {
    if (watch) {
      throw GenError('"flags" must be a file path when "watch" is true')
    }
    try {
      JSON.stringify(flags)
    } catch (err) {
      throw GenError('"flags" must be object which could be converted to json')
    }
  } else if (typeof flags !== 'string') {
    throw GenError('"flags" must be object or file path')
  }
  if (ignoreFiles) {
    if (!isPlainObject(ignoreFiles)) {
      throw GenError('"ignoreFiles" must be object')
    }
    Object.entries(ignoreFiles).forEach(([k, rs]) => {
      if (!Array.isArray(rs)) { rs = [rs] }
      rs.forEach(r => {
        if (!(r instanceof RegExp)) {
          throw GenError(`"ignoreFiles" must use regular expression as value: ${k}`)
        }
      })
    })
  }
  return {
    namespace, watch, ignoreFiles, flags
  }
}

function codegen () {
/* eslint-disable */
"use strict";
var flags = Object.freeze(FLAGS_OBJECT_VALUE);
module.exports = (typeof window === 'object' && window.document) ? (
  typeof Proxy === 'function' ? new Proxy(flags, {
    get(target, name) {
      if (name in target) {
        return target[name];
      }
      if (name === Symbol.toPrimitive) {
        return () => JSON.stringify(target);
      }
      throw new Error('PLUGIN_NAME: Unknown flag name, "' + name + '" is not defined.');
    },
  }) : flags) : flags;
}

/* eslint-enable */
codegen.toCode = function toCode (flags) {
  const funcStr = Function.prototype.toString.call(this)
  const bodyStr = funcStr.substring(funcStr.indexOf('{') + 1, funcStr.lastIndexOf('}'))
  return bodyStr.replace('FLAGS_OBJECT_VALUE', JSON.stringify(flags, null, 2))
    .replace('PLUGIN_NAME', PLUGIN_NAME).trim()
}

function updateGetFlags (flagPath, flagsPath, errors = 0) {
  clearModule(flagPath)
  let newFlags
  try {
    newFlags = require(flagPath)
    JSON.stringify(newFlags)
  } catch (err) {
    // errors is used for different editor file-writting mechanism
    if (errors > 10) { throw err }
    return updateGetFlags(flagPath, flagsPath, errors + 1)
  }
  fs.writeFileSync(flagsPath, codegen.toCode(newFlags))
  return newFlags
}

function getFilters (filterMap, flags) {
  const filters = []
  filterMap.forEach((regs, key) => {
    try {
      if (!key.call(flags)) {
        filters.push(...regs)
      }
    } catch (e) {
      throw GenError(`Missing flag "${regs.__flag_name__}" at "ignoreFiles" option, ${e.message}`)
    }
  })
  return filters
}

function setOptions ({ flags, ignoreFiles, namespace, watch }, context, watchOptions, dev) {
  /**
   * pluginOptions: {
   *  namespace: string
   *  flags: object,
   *  cachedFlagsPath: string
   *  watch?: boolean
   *  allFiles?: RegExp[],
   *  ignoreFiles?: RegExp[]
   * }
   */
  const pluginOptions = {
    namespace
  }

  // handle flags
  let flagsPath
  let flagsObj
  if (typeof flags === 'string') {
    if (!path.isAbsolute(flags)) {
      flags = path.resolve(context, flags)
    }
    try {
      flagsObj = require(flags)
      JSON.stringify(flags)
    } catch (err) {
      throw GenError(`Options: "flags" cannot be resolved as plain object, ${err.message}`)
    }
    flagsPath = flags
  } else {
    flagsObj = flags
  }
  pluginOptions.flags = flagsObj
  pluginOptions.cachedFlagsPath = createCacheFlagsPath(namespace)
  if (watch) {
    if (!dev) {
      throw GenError('Make sure only use "watch" in development mode!')
    }
    pluginOptions.watch = true
    const watchPaths = {
      files: new Set([flagsPath]),
      dirs: new Set()
    }
    if (Array.isArray(watch)) {
      watch.forEach(watchPattern => {
        glob.sync(watchPattern, { cwd: context, absolute: true }).forEach(file => {
          const stat = fs.lstatSync(file)
          if (stat.isFile()) {
            watchPaths.files.add(file)
          } else if (stat.isDirectory()) {
            watchPaths.dirs.add(file)
          }
        })
      })
    }
    const allWatch = [
      ...watchPaths.files, ...watchPaths.dirs
    ]
    const watcher = new Watchpack(Object.assign({}, watchOptions))
    watcher.watch([...watchPaths.files], [...watchPaths.dirs], Date.now() - 100)
    let delay // some file systems will trigger "change" event many times
    watcher.on('change', () => {
      clearTimeout(delay)
      delay = setTimeout(() => {
        allWatch.forEach(f => clearModule(f))
        pluginOptions.flags = updateGetFlags(flagsPath, pluginOptions.cachedFlagsPath)
      }, 338) // 🙂
    })
    // in order to be able to close it
    pluginOptions.watcher = watcher
    Array('SIGINT', 'SIGTERM', 'SIGHUP').forEach(sig => { // eslint-disable-line
      process.on(sig, () => {
        watcher.close()
      })
    })
  } else {
    fs.writeFileSync(pluginOptions.cachedFlagsPath, `module.exports = ${JSON.stringify(flags)}`)
  }
  // handle files
  if (ignoreFiles && Object.keys(ignoreFiles).length) {
    const filterMap = new Map()
    pluginOptions.allFiles = []
    Object.keys(ignoreFiles).forEach(flagExp => {
      const regs = Array.isArray(ignoreFiles[flagExp]) ? ignoreFiles[flagExp] : [ignoreFiles[flagExp]]
      regs.__flag_name__ = flagExp
      regs.forEach(r => {
        r.__flag_name__ = flagExp
        pluginOptions.allFiles.push(r)
      })
      try {
        filterMap.set(toFunc(flagExp), regs)
      } catch (e) {
        throw GenError(`Invalid flag value "${flagExp}" at "ignoreFiles" option, ${e.message}`)
      }
    })
    let filterList
    Object.defineProperty(pluginOptions, 'ignoreFiles', {
      get () {
        const { flags } = pluginOptions
        if (watch) {
          return getFilters(filterMap, flags)
        } else {
          return filterList || (filterList = getFilters(filterMap, flags))
        }
      }
    })
  }
  return pluginOptions
}

module.exports = {
  setOptions,
  validateOptions
}
