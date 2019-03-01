const loaderUtils = require('loader-utils')
const { RESOLVED_FLAGS_PATH, IF_FLAG } = require('./constants')
const testDirective = new RegExp(`<.+\\s${IF_FLAG}\\s*=\\s*.+?[\\s|>]`)
const hotReloadRegs = [/module\.hot\.accept\(/, /module\.hot\.data/, /vue/]

/**
 * only used in watch mode, do not anything but add flag dependency
 */
module.exports = function vueFlagsTemplateLoader (source, map) {
  let vue, type
  if (this.resourceQuery && this.resourceQuery[0] === '?') {
    ({ vue, type } = loaderUtils.parseQuery(this.resourceQuery))
  }
  if (vue && type === 'template' && testDirective.test(source)) {
    this.addDependency(RESOLVED_FLAGS_PATH)
  }
  if (!type && this.hot && hotReloadRegs.every(r => r.test(source))) {
    // create component hot reload record by removing `module.hot.data`, see `vue-hot-reload-api`
    // __VUE_HOT_MAP__ has no record if component is ignored at first and will cause error.
    source = 'module.hot && module.hot.data && module.hot.data.__vue_component_hot__ && (module.hot.data = undefined);\n' + source
  }
  this.callback(null, source, map)
}
