const webpack = require('webpack')
const RuleSet = require('webpack/lib/RuleSet')

const { PLUGIN_NAME, RESOLVED_FLAGS_PATH } = require('./constants')
const { setOptions, validateOptions } = require('./resolve-options')
const { log } = require('./utils')
const postcssFlagsPlugin = require('./postcss-flags-plugin')

module.exports = class VueFlagsWebpackPlugin {
  constructor (options) {
    /**
     * {
     *  flags: string|object
     *  namespace: string
     *  watch: boolean
     *  files: object
     * }
     */
    this.options = validateOptions(options)
  }
  _walkRules (rules, cb) {
    for (let rule of rules) {
      if (rule.use) {
        for (let i = 0; i < rule.use.length; i++) {
          cb(rule.use, i)
        }
      }
      if (rule.oneOf) {
        this._walkRules(rule.oneOf, cb)
      }
      if (rule.rules) {
        this._walkRules(rule.rules, cb)
      }
    }
  }
  _patchRules (_rules) {
    const { rules } = new RuleSet(_rules)
    // prepend template loader before(after) vue-loader
    let vueLoaderPath
    try {
      vueLoaderPath = require.resolve('vue-loader')
    } catch (e) {
      log.warn(e.message)
    }
    if (vueLoaderPath) {
      const vueMatches = []
      const vueLoaderReg = /^vue-loader|(\/|\\|@)vue-loader/
      this._walkRules(rules, (uses, index) => {
        const loader = uses[index].loader
        if (vueLoaderReg.test(loader) || loader === vueLoaderPath) {
          vueMatches.push({ uses, index })
        }
      })
      if (vueMatches.length) {
        const templateLoaderPath = require.resolve('./template-loader')
        vueMatches.forEach(({ uses, index }) => {
          uses.splice(index, 0, {
            loader: templateLoaderPath,
            options: this.pluginOptions,
            ident: 'vue-flags-template-loader-options'
          })
        })
      } else {
        log.warn('not found "vue-loader" in webpack config')
      }
    }
    // prepend ignore module pitch loader
    if (this.pluginOptions.files) {
      const allFiles = this.pluginOptions.allFiles
      rules.unshift({
        use: [{
          loader: require.resolve('./ignore-module-loader'),
          enforce: 'post', // call pitch as soon
          options: this.pluginOptions,
          ident: 'vue-flags-ignore-module-loader-options'
        }],
        resource (resourcePath) {
          return allFiles.some(v => v.test(resourcePath))
        }
      })
    }
    return rules
  }
  apply (compiler) {
    // check env and normalize options
    if (!compiler.hooks) {
      log.warn('"webpack" < 4 is not supported')
    }
    const webpackConfig = compiler.options
    if (webpackConfig.plugins.filter(p => p.constructor === VueFlagsWebpackPlugin).length > 1) {
      log.error('do not apply this plugin multiple times')
      process.exit(-1)
    }
    this.pluginOptions = postcssFlagsPlugin.pluginOptions = setOptions(this.options, compiler)

    // replace original webpack rules
    compiler.hooks.afterEnvironment.tap(PLUGIN_NAME, () => {
      const rules = this._patchRules(webpackConfig.module.rules)
      webpackConfig.module.rules = rules
    })

    // apply flag variable plugin
    const constPlugin = this.pluginOptions.watch ? new webpack.ProvidePlugin({
      [this.pluginOptions.namespace]: RESOLVED_FLAGS_PATH
    }) : new webpack.DefinePlugin({
      [this.pluginOptions.namespace]: this.pluginOptions.flags
    })
    constPlugin.apply(compiler)
  }
}

module.exports.postcssFlagsPlugin = postcssFlagsPlugin
