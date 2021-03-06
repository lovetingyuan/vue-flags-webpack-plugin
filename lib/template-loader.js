const loaderUtils = require('loader-utils')
const { IF_FLAG } = require('./constants')
const ifDirReg = new RegExp(`\\s${IF_FLAG}(?:\\s*(=)\\s*(?:"([^"]+)"+|'([^']+)'+|([^\\s"'=<>\`]+)))`)

module.exports = function vueFlagsTemplateLoader (source, map) {
  if (this.resourceQuery) {
    const { vue, type } = loaderUtils.parseQuery(this.resourceQuery)
    const { flagsPath } = loaderUtils.getOptions(this)

    if (vue && type === 'template' && ifDirReg.test(source)) {
      this.addDependency(flagsPath)
    }
  }
  this.callback(null, source, map)
}

if (process.env.TEST === 'TEST') {
  module.exports.testFlagDir = (v) => {
    return ifDirReg.test(v)
  }
}
