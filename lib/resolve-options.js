const fs = require('fs')
const path = require('path')
const glob = require('glob')

const watchFlags = require('./watch-flags')
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
    throw GenError('"flags" must be plain object or file path')
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
   *  stopWatch?: () => void
   *  allFiles?: RegExp[],
   *  ignoreFiles?: RegExp[],
   * }
   */
  const pluginOptions = {
    namespace
  }

  // handle flags
  let flagsPath
  let flagsObj
  if (typeof flags === 'string') {
    flagsPath = flags
    if (!path.isAbsolute(flagsPath)) {
      flagsPath = path.resolve(context, flagsPath)
    }
    flagsObj = require(flagsPath)
  } else {
    flagsObj = flags
  }
  pluginOptions.flags = flagsObj
  pluginOptions.cachedFlagsPath = createCacheFlagsPath(namespace)
  // handle watch
  if (watch) {
    if (!dev) {
      throw GenError('Make sure only use "watch" in development mode')
    }
    pluginOptions.watch = true
    const watchPaths = {
      files: new Set([flagsPath]),
      dirs: new Set()
    }
    Array.isArray(watch) && watch.forEach(watchPattern => {
      glob.sync(watchPattern, { cwd: context, absolute: true }).forEach(file => {
        const stat = fs.lstatSync(file)
        if (stat.isFile()) {
          watchPaths.files.add(file)
        } else if (stat.isDirectory()) {
          watchPaths.dirs.add(file)
        }
      })
    })
    watchFlags(watchPaths, pluginOptions, watchOptions)
  } else {
    fs.writeFileSync(pluginOptions.cachedFlagsPath, `module.exports = ${JSON.stringify(flagsObj)}`)
  }
  // handle ignore modules
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
