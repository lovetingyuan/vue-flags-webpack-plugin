const { pluginOptions } = require('./resolve-options')
const { RESOLVED_FLAGS_PATH } = require('./constants')
// const { resolveFiles, pluginOptions } = require('./resolve-options')
module.exports = function ignoreModuleLoader (code) {
  return code
}

module.exports.pitch = function pitch () {
  this.addDependency(RESOLVED_FLAGS_PATH)
  if (pluginOptions.files.some(v => v.test(this.resourcePath))) {
    return `module.exports=null`
  }
}
