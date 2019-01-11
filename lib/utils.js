const chalk = require('chalk')
const { PLUGIN_NAME } = require('./constants')

exports.log = {
  warn (msg) {
    console.warn(chalk.yellow(`${PLUGIN_NAME} warning: ${msg}.`))
  },
  error (msg, exit) {
    console.error(chalk.red(`${PLUGIN_NAME} error: ${msg}.`))
    exit && process.exit(-1)
  }
}
