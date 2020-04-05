const loaderUtils = require('loader-utils')
const { PLUGIN_NAME } = require('./constants')

module.exports = function ignoreModuleLoader (code, map) {
  this.callback(null, code, map)
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

module.exports.pitch = function ignoreLoaderPitch () {
  const { flagsPath, ignoreFiles } = loaderUtils.getOptions(this)
  flagsPath && this.addDependency(flagsPath)
  const matched = ignoreFiles.find(v => v.test(this.resourcePath))
  if (matched) {
    const rawRequest = getRequestRes(this._module.rawRequest || this.request)
    const logMsg = JSON.stringify(
      `${PLUGIN_NAME}: ` +
      `This module ${rawRequest} was ignored due to flag ${JSON.stringify(matched.__flag_name__)}`
    )
    return `process.env.NODE_ENV === 'development' && console.warn(${logMsg})\n` +
      'module.exports = undefined'
  }
}
