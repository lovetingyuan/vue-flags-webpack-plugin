const loaderUtils = require('loader-utils')
const transformTemplate = require('./transform-template')

/**
 * vue template loader is inlined by vue-loader pitch
 * vue-loader will select the language block
 */
module.exports = function vueFlagsTemplateLoader (source, map) {
  if (this['vue-loader'] && this.resourceQuery[0] === '?') {
    const { vue, type } = loaderUtils.parseQuery(this.resourceQuery)
    if (vue && type === 'template') {
      return transformTemplate(source, this)
    }
  }
  this.callback(null, source, map)
}
