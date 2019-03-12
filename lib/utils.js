const { PLUGIN_NAME } = require('./constants')

class VueFlagsWebpackPluginError extends Error {
  constructor (message) {
    super(message)
    this.name = PLUGIN_NAME + ' Error'
  }
}

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
