const loaderUtils = require('loader-utils')
const transformTemplate = require('./transform-template')
const { RESOLVED_FLAGS_PATH, IF_FLAG } = require('./constants')
const testDirective = new RegExp(`\\s${IF_FLAG}\\s*=\\s*.+?[\\s|>]`)
const NS = (() => {
  try {
    return require('vue-loader/lib/plugin').NS
  } catch (e) {}
})()

/**
 * vue template loader is inlined by vue-loader pitch
 * vue-loader will select the language block
 */
module.exports = function vueFlagsTemplateLoader (source, map) {
  if (!NS) {
    this.emitError(new Error('vue-loader < 15 is not supported.'))
    return source
  }
  if (this[NS] && this.resourceQuery[0] === '?') {
    const { vue, type } = loaderUtils.parseQuery(this.resourceQuery)
    if (vue && type === 'template') {
      if (testDirective.test(source)) {
        const pluginOptions = loaderUtils.getOptions(this)
        if (pluginOptions.watch) {
          this.addDependency(RESOLVED_FLAGS_PATH)
        }
        try {
          source = transformTemplate(source, pluginOptions.flags)
          this.callback(null, source, map)
        } catch (e) {
          this.callback(e)
        }
        return
      }
    }
  }
  this.callback(null, source, map)
}
