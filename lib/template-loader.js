const loaderUtils = require('loader-utils')
const { RESOLVED_FLAGS_PATH, IF_FLAG } = require('./constants')
const ifDirReg = new RegExp(`\\s${IF_FLAG}(?:\\s*(=)\\s*(?:"([^"]+)"+|'([^']+)'+|([^\\s"'=<>\`]+)))`)
const hotReloadRegs = [/module\.hot\.accept\(/, /module\.hot\.data/, /vue/]

module.exports = function vueFlagsTemplateLoader (source, map) {
  let vue, type
  const { watch } = loaderUtils.getOptions(this)
  if (!watch) {
    return this.callback(null, source, map)
  }
  if (this.resourceQuery) {
    ({ vue, type } = loaderUtils.parseQuery(this.resourceQuery))
  }
  if (vue && type === 'template' && ifDirReg.test(source)) {
    this.addDependency(RESOLVED_FLAGS_PATH)
  }
  if (!type && this.hot && hotReloadRegs.every(r => r.test(source))) {
    // create component hot reload record by removing `module.hot.data`, see `vue-hot-reload-api`
    source = 'module.hot && module.hot.data && module.hot.data.__vue_component_hot__ && (module.hot.data = undefined);\n' + source
  }
  this.callback(null, source, map)
}
