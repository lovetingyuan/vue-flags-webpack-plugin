const { POSTCSS_SUPPORT_PROPERTY } = require('./constants')
const chalk = require('chalk')

const { flagsInfo } = require('./resolve-options')

const expMarks = { and: '&&', or: '||', not: '!' }

/**
 * transform @supports rules
 * @param {object} flags
 */
module.exports = function postcssFlagsPlugin () {
  return function supportsFlagsPlugin (css) {
    css.walkAtRules(function (rule) {
      if (rule.name !== 'supports') return
      let notHandle, hasFlag
      let expression = rule.params.replace(/\(([^()]+?)\)/g, function (_s, exp) {
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
      expression = expression.replace(/\s*(not|and|or)\s*/g, (_s, key) => expMarks[key])
      try {
        const result = (new Function(`with(this){return ${expression}}`)).call(flagsInfo.flags) // eslint-disable-line
        result ? rule.replaceWith(...rule.nodes) : rule.remove()
      } catch (e) {
        throw new Error(
          `Postcss flags plugin Error: "${chalk.red(rule.params)}" at ${rule}.\n` +
          'Unknown flag name: ' + e.message
        )
      }
    })
  }
}
