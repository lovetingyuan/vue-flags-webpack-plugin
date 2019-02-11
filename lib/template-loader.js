const loaderUtils = require('loader-utils')
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
    if (vue && type === 'template' && testDirective.test(source)) {
      this.addDependency(RESOLVED_FLAGS_PATH)
    }
  }
  this.callback(null, source, map)
}
