const loaderUtils = require('loader-utils')
const transformTemplate = require('./transform-template')
const { flagsInfo } = require('./resolve-options')

module.exports = function vueFlagsTemplateLoader (source, map, meta) {
  if (this.resourceQuery[0] === '?') {
    const { vue, type } = loaderUtils.parseQuery(this.resourceQuery)
    if (vue && type === 'template') {
      return transformTemplate(source, flagsInfo.flags, this)
    }
  }
  this.callback(null, source, map, meta)
}
