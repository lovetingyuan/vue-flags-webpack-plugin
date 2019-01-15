const loaderUtils = require('loader-utils')
const transformTemplate = require('./transform-template')
const { pluginOptions } = require('./resolve-options')
const { RESOLVED_FLAGS_PATH, IF_FLAG } = require('./constants')
const testDirective = new RegExp(`\\s${IF_FLAG}\\s*=\\s*.+?[\\s|>]`)

/**
 * vue template loader is inlined by vue-loader pitch
 * vue-loader will select the language block
 */
module.exports = function vueFlagsTemplateLoader (source, map) {
  const { NS } = loaderUtils.getOptions(this)
  if (this[NS] && this.resourceQuery[0] === '?') {
    const { vue, type } = loaderUtils.parseQuery(this.resourceQuery)
    if (vue !== null && type === 'template') {
      if (!testDirective.test(source)) {
        return source
      }
      if (pluginOptions.watch) {
        this.addDependency(RESOLVED_FLAGS_PATH)
      }
      try {
        return transformTemplate(source, pluginOptions.flags)
      } catch (e) {
        this.emitError(e)
      }
    }
  }
  this.callback(null, source, map)
}
