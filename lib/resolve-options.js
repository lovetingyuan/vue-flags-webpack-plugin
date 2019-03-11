const fs = require('fs-extra')
const path = require('path')
const Watchpack = require('watchpack')
const clearModule = require('clear-module')
const validateOptions = require('schema-utils')

const { RESOLVED_FLAGS_PATH, PLUGIN_NAME } = require('./constants')
const { genError, toFunc } = require('./utils')

const flagsSchema = {
  type: 'object',
  additionalProperties: true,
  patternProperties: {
    '^.+$': {
      type: 'boolean'
    }
  }
}

const optionSchema = (watch) => {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['flags', 'namespace'],
    properties: {
      flags: watch ? { type: 'string', minLength: 1 } : {
        oneOf: [
          { type: 'string', minLength: 1 },
          flagsSchema
        ]
      },
      files: {
        type: 'object',
        patternProperties: {
          '^.+$': {
            oneOf: [
              { instanceof: 'RegExp' },
              {
                type: 'array',
                minItems: 1,
                items: { instanceof: 'RegExp' }
              }
            ]
          }
        },
        additionalProperties: true
      },
      namespace: { type: 'string', minLength: 1 },
      watch: { type: 'boolean' }
    }
  }
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
    throw new Error('PLUGIN_NAME: Unknown flag name, "' + name + '" is not defined.');
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

function updateGetFlags (flagsFilePath, errors = 0) {
  if (fs.statSync(flagsFilePath).isDirectory()) {
    fs.readdirSync(flagsFilePath).forEach(name => {
      clearModule(path.join(flagsFilePath, name))
    })
  }
  clearModule(flagsFilePath)
  let newFlags
  try {
    newFlags = require(flagsFilePath)
  } catch (e) {
    // errors is used for different editor file-writting mechanism
    if (errors > 10) { throw e }
    return updateGetFlags(flagsFilePath, errors + 1)
  }
  validateOptions(flagsSchema, newFlags, PLUGIN_NAME)
  fs.outputFileSync(RESOLVED_FLAGS_PATH, codegen.toCode(newFlags))
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
      throw genError(`Missing flag "${regs.__flag_name__}" at "files" option, ${e.message}`)
    }
  })
  return filters
}

function setOptions ({ flags, files, namespace, watch }, context, watchOptions, dev) {
  const pluginOptions = { watch }
  // handle flags
  if (typeof flags === 'string' && !path.isAbsolute(flags)) {
    flags = path.resolve(context, flags)
  }
  if (watch) {
    if (!dev) {
      throw genError('Make sure only use "watch" in development mode!')
    }
    const flagPath = flags
    const stats = fs.statSync(flagPath)
    const [isDir, isFile] = [stats.isDirectory(), stats.isFile()]
    if (!isFile && !isDir) {
      throw genError(`flag option: ${flagPath} is not a file or directory`)
    }
    pluginOptions.flags = updateGetFlags(flagPath)
    const watcher = new Watchpack(watchOptions || {})
    watcher.watch(isDir ? [] : [flagPath], isDir ? [flagPath] : [], Date.now() - 100)
    let timer // some editors will trigger "change" event many times
    watcher.on('change', () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        pluginOptions.flags = updateGetFlags(flagPath)
      }, 824)
    })
  } else {
    if (typeof flags === 'string') {
      flags = require(flags)
      validateOptions(flagsSchema, flags, PLUGIN_NAME)
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
  if (files && Object.keys(files).length) {
    const filterMap = new Map()
    pluginOptions.allFiles = []
    Object.keys(files).forEach(flagExp => {
      const regs = Array.isArray(files[flagExp]) ? files[flagExp] : [files[flagExp]]
      regs.__flag_name__ = flagExp
      regs.forEach(r => {
        r.__flag_name__ = flagExp
        pluginOptions.allFiles.push(r)
      })
      try {
        filterMap.set(toFunc(flagExp), regs)
      } catch (e) {
        throw genError(`Invalid flag value "${flagExp}" at "files" option, ${e.message}`)
      }
    })
    let filterList
    Object.defineProperty(pluginOptions, 'files', {
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
    const schema = optionSchema(options && options.watch)
    validateOptions(schema, options, PLUGIN_NAME)
    return options
  }
}
