// see https://webpack.js.org/plugins/ignore-plugin/
const { PLUGIN_NAME, EMPTY_MODULE_PATH } = require('./constants')
const { pluginOptions } = require('./resolve-options')

module.exports = class IgnorePlugin {
  _checkIgnore (result) {
    if (!result.resource) { return result }
    const drop = pluginOptions.files.some(v => v.test(result.resource))
    if (drop) {
      result.resource = EMPTY_MODULE_PATH
      result.request = EMPTY_MODULE_PATH
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
