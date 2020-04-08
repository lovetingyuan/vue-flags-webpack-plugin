const chalk = require('chalk')
const path = require('path')
const clearModule = require('clear-module')

const { SUPPORTS_PROPERTY } = require('./constants')
const { toFunc, isPlainObject } = require('./utils')

const expMarks = { and: '&&', or: '||', not: '!' }
const expReg = /[\s()]?(not|and|or)[\s(]/g // not(and (or ( not() and () or (() not ()))
const pluginName = 'postcss-flags-plugin'

function transformExpression (rule, ret) {
  const properties = []
  let missingValue
  let expression = rule.params.replace(/\(([^()]+?)\)/g, (_s, exp) => {
    const [prop, value] = exp.split(':').map(v => v.trim())
    properties.push(prop)
    if (!value) missingValue = true
    return `(${value})`
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
  expression = expression.replace(expReg, (str, key) => {
    return str.replace(key, expMarks[key]).trim()
  })
  return expression.trim()
}

/**
 * transform "@supports" rules
 * @param {object} flags
 */
function postcssFlagsPlugin (postcssOptions) {
  return function supportsFlagsPlugin (css, ret) {
    // postcssFlagsPlugin.options is set by vue-feature-flag-plugin
    const options = postcssOptions || postcssFlagsPlugin.options || {}
    let flagsObj = options.flags
    if (typeof flagsObj === 'string') {
      if (!path.isAbsolute(options.flags)) {
        throw new Error(`${pluginName}: options.flags must be an absolute file path.`)
      }
      clearModule(options.flags)
      flagsObj = require(options.flags)
    }
    if (!isPlainObject(flagsObj)) {
      throw new Error(`${pluginName}: value resolve from options.flags must be a plain object.`)
    }
    css.walkAtRules(onAtRule)
    function onAtRule (rule) {
      if (rule.name !== 'supports') return
      const expression = transformExpression(rule, ret)
      if (!expression) return
      let keep
      try {
        keep = toFunc(expression).call(flagsObj)
      } catch (err) {
        throw new Error(`\n${pluginName}: Unknown flag name(${err.message}) at\n${chalk.red(rule)}\n`)
      }
      if (keep) {
        rule.walkAtRules(onAtRule)
        rule.replaceWith(rule.nodes)
      } else {
        rule.remove()
      }
      if (typeof options.flags === 'string') {
        ret.messages = ret.messages || []
        if (!ret.messages.find(({ file }) => file === options.flags)) {
          ret.messages.push({
            type: 'dependency', // only works with postcss-loader
            file: options.flags
          })
        }
      }
    }
  }
}

module.exports = postcssFlagsPlugin

if (process.env.NODE_ENV === 'TEST') {
  module.exports.transformExpression = transformExpression
}
