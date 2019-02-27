const chalk = require('chalk')
const { PLUGIN_NAME } = require('./constants')

exports.genError = function genError (msg, prefix) {
  prefix = prefix || chalk.white.bgRed.bold(` ${PLUGIN_NAME} error: `)
  return new Error(prefix + msg)
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
