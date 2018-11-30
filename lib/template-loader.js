const loaderUtils = require('loader-utils')
const transformTemplate = require('./transform-template')
const VUE_LOADER_15 = !!require('vue-loader').VueLoaderPlugin

module.exports = function vueFlagsTemplateLoader (content) {
  if (VUE_LOADER_15 && this.resourceQuery[0] === '?') {
    const { vue, type } = loaderUtils.parseQuery(this.resourceQuery)
    if (vue && type === 'template') {
      const { flags } = loaderUtils.getOptions(this)
      return transformTemplate(content, flags, this)
    }
  }
  return content
}

module.exports.pitch = function () {
  if (VUE_LOADER_15) return
  let loaderPath
  try {
    loaderPath = require.resolve('vue-loader/lib/template-compiler')
  } catch (e) {
    e.message = 'Not found vue-loader template compiler path, please upgrade "vue-loader".' + e.message
    this.emitError(e)
    return
  }
  const loader = this.loaders.find(v => v.path === loaderPath)
  if (!loader || !loader.normal) return
  const originNormal = loader.normal
  const oThis = this
  const { flags } = loaderUtils.getOptions(oThis) || {}
  loader.normal = function patchedVueTemplateCompiler (content, ...args) {
    return originNormal.call(this, transformTemplate(content, flags, oThis), ...args)
  }
}
