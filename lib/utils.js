const chalk = require('chalk')
const fs = require('fs')
const { PLUGIN_NAME } = require('./constants')

exports.genError = function genError (msg) {
  return new Error(chalk.white.bgRed.bold(` ${PLUGIN_NAME} error: `) + ' ' + (msg) + '!')
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

// not 100% guaranteed but almost
exports.waitFileFinishWrited = function (file, callback) {
  let stats = {}
  let sameCount = 0
  let timer = setInterval(() => {
    const size = stats.size
    stats = fs.statSync(file)
    if (size && size === stats.size) {
      if (++sameCount > 6) {
        clearInterval(timer)
        callback()
      }
    } else {
      sameCount = 0
    }
  }, 225)
}
