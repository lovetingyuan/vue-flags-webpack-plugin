// see https://webpack.js.org/plugins/ignore-plugin/
const { PLUGIN_NAME } = require('./constants')
const { pluginOptions, resolveFiles } = require('./resolve-options')
const emptyModulePath = require.resolve('./empty-module')

module.exports = class IgnorePlugin {
  _checkIgnore (result) {
    if (!result.resource) { return result }
    const conditions = pluginOptions.watch ? resolveFiles(pluginOptions.files) : pluginOptions.files
    const drop = conditions.some(v => v.test(result.resource))
    if (drop) {
      result.resource = emptyModulePath
    }
    return result
  }
  apply (compiler) {
    const checkIgnore = this._checkIgnore.bind(this)
    compiler.hooks.normalModuleFactory.tap(PLUGIN_NAME, nmf => {
      nmf.hooks.afterResolve.tap(PLUGIN_NAME, checkIgnore)
    })
    compiler.hooks.contextModuleFactory.tap(PLUGIN_NAME, cmf => {
      cmf.hooks.afterResolve.tap(PLUGIN_NAME, checkIgnore)
    })
  }
}
