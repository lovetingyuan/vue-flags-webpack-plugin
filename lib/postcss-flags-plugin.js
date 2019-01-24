const chalk = require('chalk')

const { POSTCSS_SUPPORT_PROPERTY, RESOLVED_FLAGS_PATH, PLUGIN_NAME } = require('./constants')
// const { pluginOptions } = require('./resolve-options')
const { isPlainObject } = require('./utils')

const expMarks = { and: '&&', or: '||', not: '!' }
const expReg = /\s*(not|and|or)\s*/g
const pluginName = 'postcss-flags-plugin'

/**
 * transform "@supports" rules
 * @param {object} flags
 */
module.exports = function postcssFlagsPlugin (flags) {
  return function supportsFlagsPlugin (css, ret) {
    const { pluginOptions } = postcssFlagsPlugin
    const _flags = {}
    let watch = false
    if (!pluginOptions) {
      if (!isPlainObject(flags)) {
        ret.warn(`flags passed to ${pluginName} is not an object.`)
        return
      }
      Object.assign(_flags, flags)
    } else {
      if (isPlainObject(flags)) {
        ret.warn(`${pluginName}: will use flags resolved from ${PLUGIN_NAME}, flags passed to this plugin will be ignored.`)
      }
      Object.assign(_flags, pluginOptions.flags)
      watch = pluginOptions.watch
    }

    css.walkAtRules(function (rule) {
      if (rule.name !== 'supports') return
      const properties = []
      let expression = rule.params.replace(/\(([^()]+?)\)/g, (_s, exp) => {
        const [ns, name] = exp.split(':').map(v => v.trim())
        properties.push(ns)
        return name
      })
      const flagsProps = properties.filter(v => v === POSTCSS_SUPPORT_PROPERTY)
      if (!flagsProps.length) return
      if (flagsProps.length !== properties.length) {
        ret.warn(`${pluginName}: "${POSTCSS_SUPPORT_PROPERTY}" in "@supports" can not be used with other properties at\n${chalk.yellow(rule)}`)
        return
      }
      expression = expression.replace(expReg, (_s, key) => expMarks[key])
      let keep
      try {
        keep = (new Function(`with(this){return ${expression}}`)).call(_flags) // eslint-disable-line
      } catch (e) {
        throw new Error(`\n${pluginName}: Unknown flag name(${e.message}) at\n${chalk.red(rule)}\n`)
      }
      if (keep) {
        rule.replaceWith(...rule.nodes)
      } else {
        rule.remove()
      }
      if (watch) {
        ret.messages = ret.messages || []
        ret.messages.push({
          type: 'dependency',
          file: RESOLVED_FLAGS_PATH
        })
      }
    })
  }
}
