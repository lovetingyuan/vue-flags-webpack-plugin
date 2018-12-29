const { RESOLVED_FLAGS_PATH, PLUGIN_NAME } = require('./constants')

const flagsInfo = {
  flags: {}
}

let pluginOptions = {
  namespace: 'flags', watch: false
}

const fs = require('fs-extra')
const path = require('path')
const clearModule = require('clear-module')
const isPlainObject = require('lodash.isplainobject')
const chokidar = require('chokidar')

function setOptions (options) {
  let { flags, files, namespace, watch } = options
  if (!namespace) { namespace = 'flags' }
  if (watch) {
    if (process.env.NODE_ENV !== 'development') {
      console.warn(`${PLUGIN_NAME}: project does not seem to be in development mode, make sure watch is diabled.`)
    }
    let flagsFilePath = flags
    if (typeof flagsFilePath !== 'string' || !path.isAbsolute(flagsFilePath)) {
      throw new Error('"flags" must be an absolute file path when "watch" is true.')
    }
    fs.ensureFileSync(RESOLVED_FLAGS_PATH)
    flagsInfo.flags = require(flagsFilePath)
    if (!isPlainObject(flagsInfo.flags)) {
      throw new Error(`flags resolved from ${flagsFilePath} is not a plain object.`)
    }
    fs.outputJsonSync(RESOLVED_FLAGS_PATH, flagsInfo.flags)
    chokidar.watch(flagsFilePath, {
      persistent: true
    }).on('change', () => {
      clearModule(flags)
      clearModule(RESOLVED_FLAGS_PATH)
      flagsInfo.flags = require(flags)
      fs.outputJsonSync(RESOLVED_FLAGS_PATH, flagsInfo.flags)
    })
  } else {
    if (typeof flags === 'string') {
      if (!path.isAbsolute(flags)) {
        throw new Error('flags must be an absolute file path.')
      }
      flags = require(flags)
    }
    if (!isPlainObject(flags)) {
      throw new Error('flags is not a plain object.')
    }
    flagsInfo.flags = flags
  }
  Object.assign(pluginOptions, {
    flags, namespace, watch
  })
  pluginOptions.ignoreFile = function ignoreFile (resourcePath) {
    let result = []
    if (this.watch) {
      Object.keys(files).forEach(flagName => {
        if (flagsInfo.flags[flagName]) { return }
        if (Array.isArray(files[flagName])) {
          result.push(...files[flagName])
        } else {
          result.push(files[flagName])
        }
      })
    }
    if (this.watch) {
      const result = []

      return result.some(v => v.test(resourcePath))
    }
  }
  Object.defineProperty(pluginOptions, 'files', {
    get () {
      if (this.watch) {
        const result = []
        Object.keys(files).forEach(flagName => {
          if (flagsInfo.flags[flagName]) { return }
          if (Array.isArray(files[flagName])) {
            result.push(...files[flagName])
          } else {
            result.push(files[flagName])
          }
        })
        return result
      }
      return files
    }
  })
}

function resolveFiles (files) {
  const result = []
  Object.keys(files).forEach(flagName => {
    if (flagsInfo.flags[flagName]) { return }
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
  flagsInfo,
  pluginOptions,
  resolveFiles
}
