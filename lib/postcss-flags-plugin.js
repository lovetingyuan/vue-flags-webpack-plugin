const chalk = require('chalk')

const { POSTCSS_SUPPORT_PROPERTY, RESOLVED_FLAGS_PATH, PLUGIN_NAME } = require('./constants')
const { pluginOptions } = require('./resolve-options')
const { isPlainObject } = require('./utils')

const expMarks = { and: '&&', or: '||', not: '!' }
const pluginName = 'postcss-flags-plugin'

/**
 * transform "@supports" rules
 * @param {object} flags
 */
module.exports = function postcssFlagsPlugin (flags) {
  return function supportsFlagsPlugin (css, ret) {
    if (pluginOptions.flags) {
      if (flags) {
        ret.warn(`${pluginName}: will use flags resolved from ${PLUGIN_NAME}, flags passed to this plugin will be ignored.`)
      }
    } else if (!isPlainObject(flags)) {
      ret.warn(`flags passed to ${pluginName} is not an object.`)
      return
    }
    const _flags = pluginOptions.flags || flags
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
          ret.warn(`${pluginName}: "${POSTCSS_SUPPORT_PROPERTY}" in "@supports" can not be used with other properties at\n${chalk.yellow(rule)}`)
        }
        return
      }
      expression = expression.replace(/\s*(not|and|or)\s*/g, (_s, key) => expMarks[key])
      try {
        const result = (new Function(`with(this){return ${expression}}`)).call(_flags) // eslint-disable-line
        result ? rule.replaceWith(...rule.nodes) : rule.remove()
        if (pluginOptions.watch) {
          ret.messages = ret.messages || []
          ret.messages.push({
            type: 'dependency',
            file: RESOLVED_FLAGS_PATH
          })
        }
      } catch (e) {
        throw new Error(`\n${pluginName}: Unknown flag name(${e.message}) at\n${chalk.red(rule)}\n`)
      }
    })
  }
}
