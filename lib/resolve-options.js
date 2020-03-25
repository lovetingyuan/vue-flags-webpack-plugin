const fs = require('fs')
const path = require('path')
const Watchpack = require('watchpack')
const clearModule = require('clear-module')
const _validateOptions = require('schema-utils')

const { RESOLVED_FLAGS_PATH, PLUGIN_NAME } = require('./constants')
const { genError, toFunc, getDependencies } = require('./utils')

const flagsSchema = {
  type: 'object',
  additionalProperties: true,
  patternProperties: {
    '^.+$': {
      type: 'boolean'
    }
  }
}

const optionsSchema = watch => {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['flags', 'namespace'],
    properties: {
      flags: watch ? {
        type: 'string', minLength: 1
      } : {
        oneOf: [
          { type: 'string', minLength: 1 },
          flagsSchema
        ]
      },
      ignoreFiles: {
        type: 'object',
        patternProperties: {
          '^.+$': {
            oneOf: [
              { instanceof: 'RegExp' },
              {
                type: 'array',
                items: { instanceof: 'RegExp' }
              }
            ]
          }
        },
        additionalProperties: true
      },
      namespace: { type: 'string', minLength: 1 },
      watch: {
        oneOf: [
          { type: 'boolean' },
          {
            type: 'array',
            items: { type: 'string', minLength: 1 }
          }
        ]
      }
    }
  }
}

function validateOptions (options, schema) {
  return _validateOptions(schema, options, {
    name: PLUGIN_NAME,
    baseDataPath: 'options'
  })
}

function codegen () {
/* eslint-disable */
"use strict";
var flags = Object.freeze(FLAGS_OBJECT_VALUE);
module.exports = typeof Proxy === 'function' ? new Proxy(flags, {
  get(target, name) {
    if (name in target) {
      return target[name];
    }
    if (name === Symbol.toPrimitive) {
      return () => JSON.stringify(target);
    }
    if (typeof window === 'object' && window.document) {
      throw new Error('PLUGIN_NAME: Unknown flag name, "' + name + '" is not defined.');
    }
  },
}) : flags;
}

/* eslint-enable */
codegen.toCode = function toCode (flags) {
  const funcStr = Function.prototype.toString.call(this)
  const bodyStr = funcStr.substring(funcStr.indexOf('{') + 1, funcStr.lastIndexOf('}'))
  return bodyStr.replace('FLAGS_OBJECT_VALUE', JSON.stringify(flags, null, 2))
    .replace('PLUGIN_NAME', PLUGIN_NAME).trim()
}

function updateGetFlags (flagsPaths, errors = 0) {
  let flagPath = flagsPaths
  if (Array.isArray(flagsPaths)) {
    flagsPaths.forEach(fp => clearModule(fp))
    flagPath = flagsPaths[0]
  } else {
    clearModule(flagPath)
  }
  let newFlags
  try {
    newFlags = require(flagPath)
  } catch (err) {
    // errors is used for different editor file-writting mechanism
    if (errors > 10) { throw err } // 😔
    return updateGetFlags(flagsPaths, errors + 1)
  }
  validateOptions(newFlags, flagsSchema)
  fs.writeFileSync(RESOLVED_FLAGS_PATH, codegen.toCode(newFlags))
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
      throw genError(`Missing flag "${regs.__flag_name__}" at "ignoreFiles" option, ${e.message}`)
    }
  })
  return filters
}

function setOptions ({ flags, ignoreFiles, namespace, watch }, context, watchOptions, dev) {
  const pluginOptions = { watch }
  // handle flags
  if (typeof flags === 'string') {
    if (!path.isAbsolute(flags)) {
      flags = path.resolve(context, flags)
    }
    try {
      flags = require.resolve(flags)
    } catch (err) {
      throw genError(`Options: "flags" cannot be resolved, ${err.message}`)
    }
  }
  if (watch) {
    if (!dev) {
      throw genError('Make sure only use "watch" in development mode!')
    }
    const flagFiles = getDependencies(() => {
      pluginOptions.flags = updateGetFlags(flags)
    }, [flags])
    if (Array.isArray(watch)) {
      watch.forEach(file => {
        if (!path.isAbsolute(file)) {
          flagFiles.push(path.resolve(context, file))
        } else {
          flagFiles.push(file)
        }
      })
    }
    const watcher = new Watchpack(Object.assign({}, watchOptions))
    watcher.watch(flagFiles, [], Date.now() - 100)
    let delay // some file systems will trigger "change" event many times
    watcher.on('change', () => {
      clearTimeout(delay)
      delay = setTimeout(() => {
        pluginOptions.flags = updateGetFlags(flagFiles)
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
    if (typeof flags === 'string') {
      flags = require(flags)
      validateOptions(flags, flagsSchema)
    }
    pluginOptions.flags = flags
  }
  // handle namespace
  try {
    if (namespace !== namespace.trim() || namespace in global) { throw new Error() }
    toFunc(`var ${namespace}={};return ${namespace}.foo`, false)()
    pluginOptions.namespace = namespace
  } catch (e) {
    throw genError(`namespace ${JSON.stringify(namespace)} is not a valid or available variable name`)
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
        throw genError(`Invalid flag value "${flagExp}" at "ignoreFiles" option, ${e.message}`)
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
  validateOptions (options) {
    const schema = optionsSchema(options && options.watch)
    validateOptions(options, schema)
    return options
  }
}
