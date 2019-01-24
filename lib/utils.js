const chalk = require('chalk')
const { PLUGIN_NAME } = require('./constants')

exports.log = {
  warn (msg) {
    console.log()
    console.warn(chalk.black.bgYellow.bold(` ${PLUGIN_NAME} warning: `) + ' ' + (msg) + '.')
    console.log()
  },
  error (msg) {
    console.log()
    console.error(chalk.white.bgRed.bold(` ${PLUGIN_NAME} error: `) + ' ' + (msg) + '!')
    console.log()
  }
}

exports.isPlainObject = function isPlainObject (value) {
  if (typeof value !== 'object' || value === null) return false
  let proto = value
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto)
  }
  return Object.getPrototypeOf(value) === proto
}
