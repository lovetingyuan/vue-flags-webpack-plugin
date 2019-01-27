const fs = require('fs-extra')
const path = require('path')
const Watchpack = require('watchpack')
const clearModule = require('clear-module')
const validateOptions = require('schema-utils')

const { RESOLVED_FLAGS_PATH, PLUGIN_NAME } = require('./constants')
const { log, waitFileFinishWrited } = require('./utils')

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

function updateGetFlags (flagsFilePath) {
  if (fs.statSync(flagsFilePath).isDirectory()) {
    fs.readdirSync(flagsFilePath).forEach(name => {
      clearModule(path.join(flagsFilePath, name))
    })
  }
  clearModule(flagsFilePath)
  const newFlags = require(flagsFilePath)
  validateOptions(flagsSchema, newFlags, PLUGIN_NAME)
  fs.outputFileSync(RESOLVED_FLAGS_PATH, codegen.toCode(newFlags))
  return newFlags
}

function getFilters (filterMap, flags) {
  const filters = []
  filterMap.forEach((regs, key) => {
    try {
      if (!(key.call(flags))) {
        filters.push(...regs)
      }
    } catch (e) {
      log.error('missing flag, ' + e.message)
    }
  })
  return filters
}

function setOptions ({ flags, files, namespace, watch }, compiler) {
  const pluginOptions = { watch }
  // handle flags
  if (typeof flags === 'string' && !path.isAbsolute(flags)) {
    flags = path.resolve(compiler.options.context, flags)
  }
  if (watch) {
    const flagPath = flags
    pluginOptions.flags = updateGetFlags(flagPath)
    const watcher = new Watchpack()
    const isDir = fs.statSync(flagPath).isDir
    watcher.watch(isDir ? [] : [flagPath], isDir ? [flagPath] : [], Date.now())
    let delay
    watcher.on('change', () => {
      clearTimeout(delay)
      delay = setTimeout(() => {
        waitFileFinishWrited(flagPath, () => {
          pluginOptions.flags = updateGetFlags(flagPath)
        })
      }, 666)
    })
    if (compiler.options.mode !== 'development') {
      log.error('make sure ONLY use "watch" in development mode 💥!')
      compiler.hooks.done.tap(PLUGIN_NAME, () => watcher.close())
    }
  } else {
    if (typeof flags === 'string') {
      flags = require(flags)
      validateOptions(flagsSchema, flags, PLUGIN_NAME)
    }
    pluginOptions.flags = flags
  }
  // handle namespace
  try {
    if (namespace in global) { throw new Error() }
    (new Function(`var ${namespace}={}; return ${namespace}.foo`))() // eslint-disable-line
    pluginOptions.namespace = namespace
  } catch (e) {
    log.error('namespace is not a valid or available variable name')
    process.exit(-1)
  }
  // handle files
  if (files && Object.keys(files).length) {
    const filterMap = new Map()
    pluginOptions.allFiles = []
    Object.keys(files).forEach(flagExp => {
      const regs = Array.isArray(files[flagExp]) ? files[flagExp] : [files[flagExp]]
      regs.forEach(r => {
        r.__flagName__ = flagExp
        pluginOptions.allFiles.push(r)
      })
      filterMap.set(new Function(`with(this){return (${flagExp})}`), regs) // eslint-disable-line
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
    const schema = optionSchema(options ? options.watch : false)
    validateOptions(schema, options, PLUGIN_NAME)
    return options
  }
}
