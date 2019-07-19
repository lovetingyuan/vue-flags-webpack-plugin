const loaderUtils = require('loader-utils')
const { RESOLVED_FLAGS_PATH, IF_FLAG } = require('./constants')
const ifDirReg = new RegExp(`\\s${IF_FLAG}(?:\\s*(=)\\s*(?:"([^"]+)"+|'([^']+)'+|([^\\s"'=<>\`]+)))`)

module.exports = function vueFlagsTemplateLoader (source, map) {
  if (this.resourceQuery) {
    const { vue, type } = loaderUtils.parseQuery(this.resourceQuery)
    if (vue && type === 'template' && ifDirReg.test(source)) {
      this.addDependency(RESOLVED_FLAGS_PATH)
    }
  }
  this.callback(null, source, map)
}
