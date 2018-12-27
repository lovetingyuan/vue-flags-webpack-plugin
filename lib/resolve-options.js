const { RESOLVED_FLAGS_PATH } = require('./constants')

const flagsInfo = {
  flags: {}
}

let pluginOptions = {
  flags: {}, namespace: 'flags', files: null, watch: false
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
    if (process.env.NDOE_ENV !== 'development') {
      console.warn('Project does not seem to be in development mode, make sure watch is diabled.')
    }
    let flagsFilePath = flags
    if (typeof flagsFilePath !== 'string' || !path.isAbsolute(flagsFilePath)) {
      throw new Error('"flags" must be an absolute file path when "watch" is true.')
    }
    fs.ensureFileSync(RESOLVED_FLAGS_PATH)
    flagsInfo.flags = require(flagsFilePath)
    fs.outputJsonSync(RESOLVED_FLAGS_PATH, flagsInfo.flags)
    chokidar.watch(flagsFilePath, {
      persistent: true
    }).on('change', () => {
      clearModule(flags)
      clearModule(RESOLVED_FLAGS_PATH)
      setTimeout(() => { // sometimes the flag is empty if not delay
        flagsInfo.flags = require(flags)
        fs.outputJsonSync(RESOLVED_FLAGS_PATH, flagsInfo.flags)
      })
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
    flags, files, namespace, watch
  })
  return pluginOptions
}

module.exports = {
  setOptions,
  flagsInfo,
  pluginOptions
}
