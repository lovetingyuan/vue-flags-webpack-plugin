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

exports.equalObj = function (a, b) {
  const keysa = Object.keys(a)
  const keysb = Object.keys(b)
  if (keysa.length !== keysb.length) return false
  return keysa.every(k => a[k] === b[k])
}
