const { pluginOptions } = require('./resolve-options')
const { RESOLVED_FLAGS_PATH } = require('./constants')

module.exports = function ignoreModuleLoader (code) { return code }

const getRequestRes = request => {
  return JSON.stringify(
    request.replace(/^-?!+/, '')
      .replace(/!!+/g, '!')
      .replace(/!$/, '').split('!').pop().split('?')[0]
  )
}

module.exports.pitch = function pitch () {
  this.addDependency(RESOLVED_FLAGS_PATH)
  let matched
  if (pluginOptions.files.some(v => {
    if (v.test(this.resourcePath)) {
      matched = v
      return true
    }
  })) {
    const rawRequest = getRequestRes(this._module.rawRequest)
    const issuer = this._module.issuer ? getRequestRes(this._module.issuer.rawRequest) : ''
    return `process.env.NODE_ENV === 'development' && console.warn('This module ${rawRequest} is ignored due to flag: ${matched.__flagName__}${issuer ? ` at ${issuer}` : ''}.');` +
      '\nmodule.exports = null'
  }
}
