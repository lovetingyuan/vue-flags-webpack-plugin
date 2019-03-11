const chalk = require('chalk')

const { RESOLVED_FLAGS_PATH, PLUGIN_NAME, SUPPORTS_PROPERTY } = require('./constants')
const { isPlainObject, toFunc } = require('./utils')

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
    const flagsObj = {}
    let watch = false
    if (!pluginOptions) {
      if (!isPlainObject(flags)) {
        ret.warn(`flags passed to ${pluginName} is not an object.`)
        return
      }
      Object.assign(flagsObj, flags)
    } else {
      if (isPlainObject(flags)) {
        ret.warn(`${pluginName}: will use flags resolved from ${PLUGIN_NAME}, flags passed to this plugin will be ignored!`)
      }
      Object.assign(flagsObj, pluginOptions.flags)
      watch = pluginOptions.watch
    }

    css.walkAtRules(function (rule) {
      if (rule.name !== 'supports') return
      const properties = []
      let missingValue
      let expression = rule.params.replace(/\(([^()]+?)\)/g, (_s, exp) => {
        const [prop, value] = exp.split(':').map(v => v.trim())
        properties.push(prop)
        if (!value) missingValue = true
        return value
      })
      const flagsProps = properties.filter(v => v === SUPPORTS_PROPERTY)
      if (!flagsProps.length) return
      if (flagsProps.length !== properties.length) {
        ret.warn(`${pluginName}: "${SUPPORTS_PROPERTY}" in "@supports" can not be used with other properties at\n${chalk.yellow(rule)}`)
        return
      }
      if (missingValue) {
        ret.warn(`${pluginName}: value of "${SUPPORTS_PROPERTY}" is missing at\n${chalk.yellow(rule)}`)
        return
      }
      expression = expression.replace(expReg, (_s, key) => expMarks[key])
      let keep
      try {
        keep = toFunc(expression).call(flagsObj)
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
          type: 'dependency', // only works with postcss-loader
          file: RESOLVED_FLAGS_PATH
        })
      }
    })
  }
}
