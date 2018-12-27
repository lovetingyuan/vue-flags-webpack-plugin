// see https://webpack.js.org/plugins/ignore-plugin/
const { PLUGIN_NAME } = require('./constants')
const { flagsInfo, pluginOptions } = require('./resolve-options')

module.exports = class IgnorePlugin {
  _checkIgnore (result) {
    if (!result.resource) { return result }
    const flags = flagsInfo.flags
    const conditions = pluginOptions.files
    if (pluginOptions.watch) {
      Object.keys(pluginOptions.files).forEach(name => {
        if (flags[name]) { return }
        if (Array.isArray(pluginOptions.files[name])) {
          conditions.push(...pluginOptions.files[name])
        } else {
          conditions.push(pluginOptions.files[name])
        }
      })
    }
    return conditions.some(v => v.test(result.resource))
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
