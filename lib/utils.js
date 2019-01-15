const chalk = require('chalk')
const { PLUGIN_NAME } = require('./constants')

function jsUcfirst (str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

exports.log = {
  warn (msg) {
    console.log()
    console.warn(chalk.black.bgYellow.bold(` ${PLUGIN_NAME} warning: `) + ' ' + jsUcfirst(msg) + '.')
    console.log()
  },
  error (msg) {
    console.log()
    console.error(chalk.white.bgRed.bold(` ${PLUGIN_NAME} error: `) + ' ' + jsUcfirst(msg) + '!')
    console.log()
  }
}

exports.requirePath = function (m, err) {
  try {
    return require.resolve(m)
  } catch (e) {
    if (typeof err === 'function') {
      err(e)
    }
  }
}
