const { RESOLVED_FLAGS_PATH, PLUGIN_NAME, EMPTY_MODULE_PATH } = require('./constants')

let pluginOptions = {}

const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const clearModule = require('clear-module')
const isPlainObject = require('lodash.isplainobject')
const chokidar = require('chokidar')

function setOptions (options, webpackConfig) {
  let { flags, files, namespace, watch } = options
  if (typeof flags === 'string') {
    if (!path.isAbsolute(flags)) {
      flags = path.resolve(webpackConfig.context, flags)
    }
  }
  if (watch) {
    if (process.env.NODE_ENV !== 'development') {
      console.log()
      console.warn(`${PLUGIN_NAME}: ${chalk.yellow('project does not seem to be in development mode, make sure "watch" is disabled.')}`)
      console.log()
    }
    let flagsFilePath = flags
    if (typeof flagsFilePath !== 'string') {
      throw new Error('"flags" must be an absolute file path when "watch" is true.')
    }
    pluginOptions.flags = require(flagsFilePath)
    if (!isPlainObject(pluginOptions.flags)) {
      throw new Error(`flags resolved from ${flagsFilePath} is not a plain object.`)
    }
    fs.ensureFileSync(RESOLVED_FLAGS_PATH)
    fs.outputJsonSync(RESOLVED_FLAGS_PATH, pluginOptions.flags)
    chokidar.watch(flagsFilePath, {
      persistent: true
    }).on('change', () => {
      clearModule(flagsFilePath)
      clearModule(RESOLVED_FLAGS_PATH)
      pluginOptions.flags = require(flagsFilePath)
      fs.outputJsonSync(RESOLVED_FLAGS_PATH, pluginOptions.flags)
    })
  } else {
    if (typeof flags === 'string') {
      flags = require(flags)
    }
    if (!isPlainObject(flags)) {
      throw new Error('flags is not a plain object.')
    }
    pluginOptions.flags = flags
  }
  fs.ensureFileSync(EMPTY_MODULE_PATH)
  fs.writeFileSync(EMPTY_MODULE_PATH, `require(${JSON.stringify(RESOLVED_FLAGS_PATH)});module.exports=null`)
  pluginOptions.namespace = namespace || 'flags'
  pluginOptions.watch = !!watch
  if (!isPlainObject(files)) {
    throw new Error('files is not a plain object.')
  }
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
  const result = []
  Object.keys(files).forEach(flagName => {
    if (pluginOptions.flags[flagName]) { return }
    if (Array.isArray(files[flagName])) {
      result.push(...files[flagName])
    } else {
      result.push(files[flagName])
    }
  })
  return result
}

module.exports = {
  setOptions,
  pluginOptions
}
