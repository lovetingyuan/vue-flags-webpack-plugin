const { RESOLVED_FLAGS_PATH, PLUGIN_NAME } = require('./constants')

const pluginOptions = {}

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const chokidar = require('chokidar')
const clearModule = require('clear-module')
const validateOptions = require('schema-utils')

const flagsSchema = [
  {
    type: 'string',
    minLength: 1
  },
  {
    type: 'object',
    additionalProperties: true,
    patternProperties: {
      '^.+$': {
        type: 'boolean'
      }
    }
  }
]

const optionSchema = (watch) => {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['flags', 'namespace'],
    properties: {
      flags: watch ? flagsSchema[0] : {
        anyOf: flagsSchema
      },
      namespace: { type: 'string', minLength: 1 },
      watch: { type: 'boolean' },
      files: {
        type: 'object',
        additionalProperties: true,
        patternProperties: {
          '^.+$': {
            oneOf: [
              {
                instanceof: 'RegExp'
              },
              {
                type: 'array',
                items: {
                  instanceof: 'RegExp'
                }
              }
            ]
          }
        }
      }
    }
  }
}

codegen.toFuncStr = function (flags) {
  const funcStr = this.toString()
  const bodyStr = funcStr.substring(funcStr.indexOf('{') + 1, funcStr.lastIndexOf('}'))
  return bodyStr.replace('FLAGS_OBJECT_VALUE', JSON.stringify(flags))
    .replace('PLUGIN_NAME', PLUGIN_NAME).trim()
}

function loadFlags (flagsFilePath) {
  clearModule(flagsFilePath)
  pluginOptions.flags = require(flagsFilePath)
  validateOptions(flagsSchema[1], pluginOptions.flags, PLUGIN_NAME)
  fs.writeFileSync(RESOLVED_FLAGS_PATH, codegen.toFuncStr(pluginOptions.flags))
}

function setOptions (options, webpackConfig) {
  let { flags, files, namespace, watch } = options
  if (typeof flags === 'string') {
    if (!path.isAbsolute(flags)) {
      flags = path.resolve(webpackConfig.context, flags)
    }
  }
  if (watch) {
    if (process.env.NODE_ENV !== 'development') {
      console.log('Warning: ')
      console.error(`${chalk.red(PLUGIN_NAME)}: project does not seem to be in development mode, make sure "watch" is disabled.`)
      console.log()
    }
    loadFlags(flags)
    chokidar.watch(flags, {
      awaitWriteFinish: true
    }).on('change', () => {
      loadFlags(flags)
    })
  } else {
    if (typeof flags === 'string') {
      flags = require(flags)
      validateOptions(flagsSchema[1], flags, PLUGIN_NAME)
    }
    pluginOptions.flags = flags
  }
  pluginOptions.namespace = namespace
  pluginOptions.watch = watch
  if (!watch) {
    files = resolveFiles(files)
  }
  Object.defineProperty(pluginOptions, 'files', {
    get () {
      return watch ? resolveFiles(files) : (files || [])
    }
  })
  return pluginOptions
}

function resolveFiles (files) {
  const filters = []
  Object.keys(files).forEach(flagName => {
    if (pluginOptions.flags[flagName]) { return }
    if (!Array.isArray(files[flagName])) {
      files[flagName] = [files[flagName]]
    }
    files[flagName].forEach(v => {
      v.__flagName__ = flagName
      filters.push(v)
    })
  })
  return filters
}

function codegen () {
  /* eslint-disable */
  var flags = FLAGS_OBJECT_VALUE;
  module.exports = typeof Proxy === 'function' ? new Proxy({}, {
    get(target, name) {
      if (name in flags) {
        return flags[name]
      }
      throw new Error(`${"PLUGIN_NAME"}: Unknown flag name, "${name}" is not defined.`)
    }
  }) : flags;
}

module.exports = {
  setOptions,
  pluginOptions,
  optionSchema,
}
