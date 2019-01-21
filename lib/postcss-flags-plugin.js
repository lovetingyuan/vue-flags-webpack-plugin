const chalk = require('chalk')

const { POSTCSS_SUPPORT_PROPERTY, RESOLVED_FLAGS_PATH } = require('./constants')
const { pluginOptions } = require('./resolve-options')
const expMarks = { and: '&&', or: '||', not: '!' }

/**
 * transform "@supports" rules
 * @param {object} flags
 */
module.exports = function postcssFlagsPlugin (flags) {
  if (!flags || typeof flags !== 'object') {
    flags = {}
  }
  return function supportsFlagsPlugin (css, ret) {
    css.walkAtRules(function (rule) {
      if (rule.name !== 'supports') return
      let notHandle
      let hasFlag
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
          console.log(`${chalk.bold.orange('postcss-flags-plugin warning:')} ${POSTCSS_SUPPORT_PROPERTY} can not be used with other properties:`)
          console.log(`  "${chalk.yellow(rule.params)}" at "${chalk.yellow(rule)}"`)
        }
        return
      }
      expression = expression.replace(/\s*(not|and|or)\s*/g, (_s, key) => expMarks[key])
      try {
        const result = (new Function(`with(this){return ${expression}}`)).call(pluginOptions.flags || flags) // eslint-disable-line
        result ? rule.replaceWith(...rule.nodes) : rule.remove()
        ret.messages = ret.messages || []
        ret.messages.push({
          type: 'dependency',
          file: RESOLVED_FLAGS_PATH
        })
      } catch (e) {
        throw new Error(
          `postcss-flags-plugin error: "${chalk.red(rule.params)}" at \n${chalk.yellow(rule)}.\n` +
          'Unknown flag name: ' + e.message
        )
      }
    })
  }
}
