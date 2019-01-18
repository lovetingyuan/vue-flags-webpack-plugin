const fs = require('fs-extra')
const path = require('path')
const Watchpack = require('watchpack')
const clearModule = require('clear-module')
const validateOptions = require('schema-utils')

const { RESOLVED_FLAGS_PATH, PLUGIN_NAME } = require('./constants')
const pluginOptions = {} // global shared
const { log, equalObj } = require('./utils')

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
        oneOf: flagsSchema
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
codegen.toString = function toString () {
  const funcStr = Function.prototype.toString.call(this)
  const bodyStr = funcStr.substring(funcStr.indexOf('{') + 1, funcStr.lastIndexOf('}'))
  return bodyStr.replace('FLAGS_OBJECT_VALUE', JSON.stringify(pluginOptions.flags, null, 2))
    .replace('PLUGIN_NAME', PLUGIN_NAME).trim()
}

function loadFlags (flagsFilePath, isDir) {
  if (isDir) {
    fs.readdirSync(flagsFilePath).forEach(name => {
      clearModule(path.join(flagsFilePath, name))
    })
  }
  clearModule(flagsFilePath)
  const newFlags = require(flagsFilePath)
  validateOptions(flagsSchema[1], newFlags, PLUGIN_NAME)
  if (equalObj(pluginOptions.flags || {}, newFlags)) {
    return
  }
  pluginOptions.flags = newFlags
  fs.outputFileSync(RESOLVED_FLAGS_PATH, codegen + '')
}

function setOptions (options, compiler) {
  let { flags, files, namespace, watch } = options
  if (typeof flags === 'string') {
    if (!path.isAbsolute(flags)) {
      flags = path.resolve(compiler.options.context, flags)
    }
  }
  if (watch) {
    const stats = fs.statSync(flags)
    const isDir = stats.isDirectory()
    loadFlags(flags, isDir)
    const watcher = new Watchpack()
    watcher.watch(isDir ? [] : [flags], isDir ? [flags] : [], Date.now())
    watcher.on('change', () => { loadFlags(flags, isDir) })
    if (compiler.options.mode !== 'development') {
      log.warn('make sure only use "watch" in development mode')
      compiler.hooks.done.tap(PLUGIN_NAME, () => watcher.close())
    }
  } else {
    if (typeof flags === 'string') {
      flags = require(flags)
      validateOptions(flagsSchema[1], flags, PLUGIN_NAME)
    }
    pluginOptions.flags = flags
  }
  try {
    if (namespace in global) { namespace = '' }
    (new Function(`var ${namespace}={};return ${namespace}.foo`))() // eslint-disable-line
    pluginOptions.namespace = namespace
  } catch (e) {
    log.error('namespace is not a valid variable name')
    process.exit(-1)
  }
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
  Object.keys(files || {}).forEach(flagName => {
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
  validateOptions (options) {
    const schema = optionSchema(options ? options.watch : false)
    validateOptions(schema, options, PLUGIN_NAME)
    return options
  }
}
