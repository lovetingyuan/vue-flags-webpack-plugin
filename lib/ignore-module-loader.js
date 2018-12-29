const loaderUtils = require('loader-utils')
// const { resolveFiles, pluginOptions } = require('./resolve-options')
module.exports = function ignoreModuleLoader (code) {
  return code
}
module.exports.pitch = function pitch () {
  if (this.resourceQuery[0] === '?') {
    const { flag } = loaderUtils.parseQuery(this.resourceQuery)
    if (flag) {
      // const files = pluginOptions.watch ? resolveFiles(pluginOptions.files) : pluginOptions.files
    }
  }
}
