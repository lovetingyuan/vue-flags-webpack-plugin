const { pluginOptions } = require('./resolve-options')
const { RESOLVED_FLAGS_PATH } = require('./constants')

module.exports = function ignoreModuleLoader (code) { return code }

const getRequestRes = request => {
  return request.replace(/^-?!+/, '')
    .replace(/!!+/g, '!')
    .replace(/!$/, '').split('!').pop().split('?')[0]
}

module.exports.pitch = function pitch () {
  this.addDependency(RESOLVED_FLAGS_PATH)
  let matched
  if (pluginOptions.files.some(v => {
    if (v.test(this.resourcePath)) {
      return matched = v // eslint-disable-line
    }
  })) {
    const rawRequest = JSON.stringify(getRequestRes(this._module.rawRequest))
    const issuer = this._module.issuer ? JSON.stringify(getRequestRes(this._module.issuer.rawRequest)) : ''
    return `console.warn('This module ${rawRequest} is ignored due to flag: ${matched.__flagName__}${issuer ? ` at ${issuer}` : ''}.');\nmodule.exports = null`
  }
}
