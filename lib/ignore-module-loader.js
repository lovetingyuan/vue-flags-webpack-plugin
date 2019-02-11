const chalk = require('chalk')
const loaderUtils = require('loader-utils')

const { RESOLVED_FLAGS_PATH, PLUGIN_NAME } = require('./constants')

module.exports = function ignoreModuleLoader (code, map) {
  if (map) {
    this.callback(null, code, map)
  } else {
    return code
  }
}

const getRequestRes = request => {
  return JSON.stringify(
    request.replace(/^-?!+/, '')
      .replace(/!!+/g, '!')
      .replace(/!$/, '')
      .split('!')
      .pop()
      .split('?')[0]
  )
}

module.exports.pitch = function pitch () {
  const pluginOptions = loaderUtils.getOptions(this)
  if (pluginOptions.watch) {
    this.addDependency(RESOLVED_FLAGS_PATH)
  }
  const matched = pluginOptions.files.find(v => v.test(this.resourcePath))
  if (matched) {
    const rawRequest = getRequestRes(this._module.rawRequest)
    let issuer = this._module.issuer ? getRequestRes(this._module.issuer.rawRequest) : ''
    issuer = issuer === rawRequest ? '' : issuer
    const msg = `This module ${rawRequest} is ignored due to flag: ` +
      `"${chalk.red(matched.__flagName__)}"${issuer ? ` at ${issuer}` : ''}`
    return 'process.env.NODE_ENV === "development" && ' +
      `console.warn(${JSON.stringify(`${PLUGIN_NAME} warning: ${msg}`)})\n` +
      'module.exports = undefined'
  }
}
