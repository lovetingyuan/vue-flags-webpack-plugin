const { RESOLVED_FLAGS_PATH, PLUGIN_NAME } = require('./constants')

const pluginOptions = {}

const fs = require('fs-extra')
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

function codegen () {
/* eslint-disable */
"use strict";
var flags = FLAGS_OBJECT_VALUE
module.exports = typeof Proxy === 'function' ? new Proxy(flags, {
  get(target, name) {
    if (name in target) {
      return target[name]
    }
    throw new Error('PLUGIN_NAME: Unknown flag name, "' + name + '" is not defined.')
  },
  set(target, key, value) {
    eval(target[key] + '=' + value)
  }
}) : Object.freeze(flags)
/* eslint-enable */
}

codegen.toString = function toString () {
  const funcStr = Function.prototype.toString.call(this)
  const bodyStr = funcStr.substring(funcStr.indexOf('{') + 1, funcStr.lastIndexOf('}'))
  return bodyStr.replace('FLAGS_OBJECT_VALUE', JSON.stringify(pluginOptions.flags, null, 2))
    .replace('PLUGIN_NAME', PLUGIN_NAME).trim()
}

function loadFlags (flagsFilePath) {
  const stats = fs.statSync(flagsFilePath)
  if (stats.isDirectory()) {
    fs.readdirSync(flagsFilePath).forEach(name => {
      clearModule(path.join(flagsFilePath, name))
    })
  }
  clearModule(flagsFilePath)
  pluginOptions.flags = require(flagsFilePath)
  validateOptions(flagsSchema[1], pluginOptions.flags, PLUGIN_NAME)
  fs.outputFileSync(RESOLVED_FLAGS_PATH, codegen + '')
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
      console.log(`${chalk.red(PLUGIN_NAME + 'warning:')} make sure only use "watch" in development mode.`)
    }
    loadFlags(flags)
    chokidar.watch(flags, {
      awaitWriteFinish: true,
      depth: 1
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

module.exports = {
  setOptions,
  pluginOptions,
  optionSchema
}
