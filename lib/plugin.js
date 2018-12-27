const { PLUGIN_NAME } = require('./constants')
const isPlainObject = require('lodash.isplainobject')
const webpack = require('webpack')
const RuleSet = require('webpack/lib/RuleSet')
const path = require('path')
const IgnorePlugin = require('./ignore-files-plugin')

module.exports = class VueFlagsWebpackPlugin {
  constructor (options = {}) {
    if (!isPlainObject(options.flags)) {
      throw new Error(`${PLUGIN_NAME} Error: "flags" in options is not a plain object`)
    }
    this.options = options
  }
  _walkRules (rules, reg, cb) {
    for (let rule of rules) {
      if (rule.use) {
        for (let i = 0; i < rule.use.length; i++) {
          reg.test(rule.use[i].loader) && cb(rule.use, i)
        }
      }
      if (rule.oneOf) {
        this._walkRules(rule.oneOf, reg, cb)
      }
      if (rule.rules) {
        this._walkRules(rule.rules, reg, cb)
      }
    }
  }
  apply (compiler) {
    const { flags, namespace, files } = this.options
    if (!Object.keys(flags).length) return
    const webpackConfig = compiler.options
    const { rules } = new RuleSet(webpackConfig.module.rules)
    let foundVueLoader
    this._walkRules(rules, /^vue-loader|(\/|\\|@)vue-loader/, (uses) => {
      uses.push({
        loader: path.resolve(__dirname, 'loader.js'),
        options: { flags },
        ident: 'vue-flags-loader-options'
      })
      foundVueLoader = true
    })
    if (!foundVueLoader) {
      throw new Error(`${PLUGIN_NAME} Error: Not found "vue-loader", please check the webpack config(config.module.rules).`)
    }
    webpackConfig.module.rules = rules
    // add plugins
    const definePlugin = new webpack.DefinePlugin(namespace ? {
      [namespace]: JSON.stringify(flags)
    } : flags)
    const regexps = []
    isPlainObject(files) && Object.keys(files).forEach(name => {
      if (flags[name]) return
      let regs = files[name]
      if (!Array.isArray(regs)) regs = [regs]
      for (let reg of regs) {
        reg instanceof RegExp && regexps.push(reg)
      }
    })
    const ignorePlugin = new IgnorePlugin(regexps)
    if (compiler.hooks) {
      definePlugin.apply(compiler)
      ignorePlugin.apply(compiler)
    } else {
      compiler.apply.apply(compiler, [definePlugin, ignorePlugin]) // eslint-disable-line
    }
  }
}

module.exports.postcssFlagsPlugin = require('./postcss-flags-plugin')
