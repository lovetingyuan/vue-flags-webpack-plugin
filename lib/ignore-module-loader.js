const loaderUtils = require('loader-utils')
const { RESOLVED_FLAGS_PATH, PLUGIN_NAME } = require('./constants')

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
  const pluginOptions = loaderUtils.getOptions(this)
  if (pluginOptions.watch) {
    this.addDependency(RESOLVED_FLAGS_PATH)
  }
  const matched = pluginOptions.ignoreFiles.find(v => v.test(this.resourcePath))
  if (matched) {
    const rawRequest = getRequestRes(this._module.rawRequest || this.request)
    const vueComponent = pluginOptions.watch && this.hot && /\.vue(\.html)?$/.test(this.resourcePath)
    const logMsg = JSON.stringify(
      `${PLUGIN_NAME} warning: ` +
      `This module ${rawRequest} was ignored due to flag ${JSON.stringify(matched.__flag_name__)}`
    )
    return `process.env.NODE_ENV === 'development' && console.warn(${logMsg})\n` +
      (vueComponent ? `module.hot && module.hot.dispose(function(data) {data.__vue_component_hot__ = true})\n` : '') +
      'module.exports = undefined'
  }
}
