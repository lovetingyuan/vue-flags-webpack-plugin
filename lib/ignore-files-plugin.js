// see https://webpack.js.org/plugins/ignore-plugin/
const { PLUGIN_NAME } = require('./constants')
const { pluginOptions } = require('./resolve-options')
const RawModule = require('webpack/lib/RawModule')

const getRequestRes = request => {
  return JSON.stringify(
    request.replace(/^-?!+/, '')
      .replace(/!!+/g, '!')
      .replace(/!$/, '').split('!').pop().split('?')[0]
  )
}

module.exports = class IgnorePlugin {
  apply (compiler) {
    compiler.hooks.normalModuleFactory.tap(PLUGIN_NAME, nmf => {
      nmf.hooks.createModule.tap(PLUGIN_NAME, result => {
        let matched
        if (pluginOptions.files.some(v => {
          if (v.test(result.resource)) {
            matched = v
            return true
          }
        })) {
          return new RawModule(
            `console.warn('This module ${getRequestRes(result.rawRequest)} is ignored by flag: ${matched.__flagName__}');module.exports = null`,
            result.resource,
            PLUGIN_NAME + '/' + result.resource
          )
        }
      })
    })
  }
}
