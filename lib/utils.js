const { PLUGIN_NAME } = require('./constants')

class VueFlagsWebpackPluginError extends Error {
  constructor (message) {
    super(message)
    this.name = PLUGIN_NAME + ' Error'
  }
}

exports.VueFlagsWebpackPluginError = VueFlagsWebpackPluginError

exports.genError = function genError (msg) {
  return new VueFlagsWebpackPluginError(msg)
}

// from Redux
exports.isPlainObject = function isPlainObject (value) {
  if (typeof value !== 'object' || value === null) return false
  let proto = value
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto)
  }
  return Object.getPrototypeOf(value) === proto
}

// cache dynamic functions
const funcsMap = Object.create(null)
exports.toFunc = function toFunc (exp, useWith = true) {
  if (!useWith) {
    return new Function(exp) // eslint-disable-line
  }
  if (!funcsMap[exp]) {
    funcsMap[exp] = new Function(`with(this){return (${exp})}`) // eslint-disable-line
  }
  return funcsMap[exp]
}

const Module = require('module')
const path = require('path')
const clearModule = require('clear-module')
exports.getDependencies = function getDependencies (callback, deps) {
  deps = new Set(deps)
  const resolveFilename = Module._resolveFilename
  Module._resolveFilename = function _resolveFilename (req, ...args) {
    const filename = resolveFilename.call(this, req, ...args)
    if (path.isAbsolute(req) && !/node_modules/.test(req)) {
      deps.add(filename)
    }
    if (/^\.{1,2}\//.test(req)) {
      deps.add(filename)
    }
    return filename
  }
  let size
  do { // against node cache
    size = deps.size
    for (let dep of deps) {
      clearModule(dep)
    }
    callback()
  } while (size !== deps.size)
  Module._resolveFilename = resolveFilename
  return [...deps]
}
