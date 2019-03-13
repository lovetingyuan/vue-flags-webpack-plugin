module.exports = function loadVueTemplateCompiler (version) {
  if (!version) {
    return require('vue-template-compiler')
  }
  return require('./build-' + version)
}
