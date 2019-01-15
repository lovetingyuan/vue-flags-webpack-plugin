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

exports.requirePath = function (m, err) {
  try {
    return require.resolve(m)
  } catch (e) {
    if (typeof err === 'function') {
      err(e)
    }
  }
}
