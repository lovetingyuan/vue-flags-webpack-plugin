const webpack = require('webpack')
const RuleSet = require('webpack/lib/RuleSet')

const { PLUGIN_NAME, RESOLVED_FLAGS_PATH } = require('./constants')
const { setOptions, pluginOptions, validateOptions } = require('./resolve-options')
const { log } = require('./utils')

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
    // attache template loader before(after) vue-loader
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
        let NS
        try {
          NS = require('vue-loader/lib/plugin').NS
        } catch (e) {
          log.error('"vue-loader" < 15 is not supported')
          process.exit(-1)
        }
        const templateLoaderPath = require.resolve('./template-loader')
        vueMatches.forEach(({ uses, index }) => {
          uses.splice(index, 0, {
            loader: templateLoaderPath,
            options: { NS },
            ident: 'vue-flags-template-loader-options'
          })
        })
      } else {
        log.warn('not found "vue-loader" in webpack config')
      }
    }
    // prepend ignore module pitch loader
    if (pluginOptions.files) {
      rules.unshift({
        use: [{
          loader: require.resolve('./ignore-module-loader'),
          ident: 'vue-flags-ignore-module-loader-options'
        }],
        resource (resourcePath) {
          return pluginOptions.allFiles.some(v => v.test(resourcePath))
        }
      })
    }
    return rules
  }
  apply (compiler) {
    // check and normalize options
    if (!compiler.hooks) {
      log.warn('"webpack" < 4 is not supported')
    }
    const webpackConfig = compiler.options
    if (webpackConfig.plugins.filter(p => p.constructor === VueFlagsWebpackPlugin).length > 1) {
      log.error('do not apply this plugin multiple times')
      process.exit(-1)
    }
    setOptions(this.options, compiler)

    // replace original webpack rules
    compiler.hooks.afterEnvironment.tap(PLUGIN_NAME, () => {
      const rules = this._patchRules(webpackConfig.module.rules)
      webpackConfig.module.rules = rules
    })

    // apply flag variable plugin
    const constPlugin = pluginOptions.watch ? new webpack.ProvidePlugin({
      [pluginOptions.namespace]: RESOLVED_FLAGS_PATH
    }) : new webpack.DefinePlugin({
      [pluginOptions.namespace]: pluginOptions.flags
    })
    constPlugin.apply(compiler)
  }
}
