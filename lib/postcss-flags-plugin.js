const { POSTCSS_SUPPORT_PROPERTY } = require('./constants')
const chalk = require('chalk')
const isPlainObject = require('lodash.isplainobject')

/**
 * transform @supports rules
 * @param {object} flags
 */
module.exports = function postcssFlagsPlugin (flags) {
  if (!isPlainObject(flags)) {
    throw new Error('Postcss flags plugin Error: "flags" is not a plain object but ' + flags)
  }
  return function supportsFlagsPlugin (css) {
    css.walkAtRules(function (rule) {
      if (rule.name !== 'supports') return
      let notHandle, hasFlag
      let expression = rule.params.replace(/\(([^()]+?)\)/g, function (str, exp) {
        const [ns, name] = exp.split(':').map(v => v.trim())
        if (ns !== POSTCSS_SUPPORT_PROPERTY) {
          notHandle = true
        } else {
          hasFlag = true
        }
        return name
      })
      if (notHandle) {
        if (hasFlag) {
          console.warn(`postcss-flags-plugin warning: "${chalk.yellow(rule.params)}" at "${chalk.yellow(rule)}" contains invalid property.`)
        }
        return
      };
      expression = expression.replace(/\s*(not|and|or)\s*/g, function (str, key) {
        return ({
          and: '&&',
          or: '||',
          not: '!'
        })[key]
      })
      try {
        const result = (new Function(`with(this){return ${expression}}`)).call(flags) // eslint-disable-line
        if (!result) {
          rule.remove()
        } else {
          rule.replaceWith(...rule.nodes)
        }
      } catch (e) {
        throw new Error(
          `Postcss flags plugin Error: "${chalk.red(rule.params)}" at ${rule}.\n` +
          'Unknown flag name: ' + e.message
        )
      }
    })
  }
}
