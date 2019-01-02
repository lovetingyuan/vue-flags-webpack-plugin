// see https://webpack.js.org/plugins/ignore-plugin/
const { PLUGIN_NAME } = require('./constants')
const { pluginOptions } = require('./resolve-options')

// see https://webpack.js.org/plugins/ignore-plugin/

module.exports = class IgnorePlugin {
  _checkIgnore (resolver, result, callback) {
    const { contextInfo, context, request, resolveOptions } = result
    resolver.resolve(contextInfo, context, request, resolveOptions, (err, resolvedPath, data) => { // eslint-disable-line
      if (pluginOptions.files.some(v => v.test(resolvedPath))) {
        callback(null, {
          contextInfo: { issuer: resolvedPath },
          context: __dirname,
          request: './empty-module.js?flag'
        })
      } else {
        callback(null, result)
      }
    })
  }
  apply (compiler) {
    compiler.hooks.normalModuleFactory.tap(PLUGIN_NAME, nmf => {
      const resolver = nmf.getResolver('normal', compiler.options.resolve || {})
      nmf.hooks.beforeResolve.tapAsync(PLUGIN_NAME, (result, callback) => {
        this._checkIgnore(resolver, result, callback)
      })
    })
    // compiler.hooks.contextModuleFactory.tap(PLUGIN_NAME, cmf => {
    //   const resolver = cmf.getResolver('context', compiler.options.resolve || {})
    //   cmf.hooks.beforeResolve.tapAsync(PLUGIN_NAME, (result, callback) => {
    //     this._checkIgnore(resolver, result, callback)
    //   })
    // })
  }
}

// module.exports = class IgnorePlugin {
//   _checkIgnore (result) {
//     if (!result.resource) { return result }
//     const drop = pluginOptions.files.some(v => v.test(result.resource))
//     if (drop) {
//       result = this.resolver.resolveSync({}, '', require.resolve('./empty-module'))
//       // return {
//       //   resource: require.resolve('./empty-module')
//       // }
//     }
//     console.log(234234, result)
//     return result
//   }
//   apply (compiler) {
//     const checkIgnore = this._checkIgnore.bind(this)

//     compiler.hooks.normalModuleFactory.tap(PLUGIN_NAME, nmf => {
//       this.resolver = nmf.getResolver('normal', compiler.options.resolve || {})
//       nmf.hooks.afterResolve.tap(PLUGIN_NAME, checkIgnore)
//     })
//     compiler.hooks.contextModuleFactory.tap(PLUGIN_NAME, cmf => {
//       cmf.hooks.afterResolve.tap(PLUGIN_NAME, checkIgnore)
//     })
//   }
// }
