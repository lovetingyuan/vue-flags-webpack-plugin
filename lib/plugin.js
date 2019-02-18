const webpack = require('webpack')
const RuleSet = require('webpack/lib/RuleSet')

const { PLUGIN_NAME, RESOLVED_FLAGS_PATH } = require('./constants')
const { setOptions, validateOptions } = require('./resolve-options')
const { log } = require('./utils')
const postcssFlagsPlugin = require('./postcss-flags-plugin')
const transformFlags = require('./transform-template')

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
  _patchRules (rawRules, dev) {
    const { rules } = new RuleSet(rawRules)
    try {
      var vueLoaderPath = require.resolve('vue-loader')
      var NS = require('vue-loader/lib/plugin').NS
    } catch (e) {
      log.warn('"vue-loader" > 15 is not installed')
    }
    if (NS && vueLoaderPath) {
      const vueMatches = []
      const vueLoaderReg = /^vue-loader|(\/|\\|@)vue-loader/
      this._walkRules(rules, (uses, index) => {
        const loader = uses[index].loader
        if (vueLoaderReg.test(loader) || loader === vueLoaderPath) {
          vueMatches.push({ uses, index })
        }
      })
      if (!vueMatches.length) {
        log.warn('not found vue-loader in webpack config')
      } else {
        vueMatches.forEach(({ uses, index }) => {
          const vueLoader = uses[index]
          vueLoader.options = vueLoader.options || {}
          vueLoader.options.compilerOptions = vueLoader.options.compilerOptions || {}
          // https://github.com/vuejs/vue/tree/dev/packages/vue-template-compiler#options
          // https://github.com/vuejs/vue/blob/dev/flow/compiler.js#L47
          if (!vueLoader.options.compilerOptions.modules) {
            vueLoader.options.compilerOptions.modules = []
          }
          vueLoader.options.compilerOptions.modules.unshift({
            postTransformNode: (ast, options) => {
              transformFlags(ast, options, this.pluginOptions, dev)
            }
          })
          if (this.pluginOptions.watch) {
            uses.splice(index, 0, {
              loader: require.resolve('./template-loader'),
              options: { NS },
              ident: 'vue-flags-template-loader-options'
            })
          }
        })
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
    if (!compiler.hooks) {
      log.error('"webpack" < 4 is not supported')
      process.exit(-1)
    }
    const { plugins, mode, context, module: moduleOption } = compiler.options
    const dev = mode === 'development'
    if (plugins.filter(p => p.constructor === VueFlagsWebpackPlugin).length > 1) {
      log.error('do not apply this plugin multiple times')
      process.exit(-1)
    }
    this.pluginOptions = postcssFlagsPlugin.pluginOptions = setOptions(this.options, context, dev)
    // replace original webpack rules
    compiler.hooks.afterEnvironment.tap(PLUGIN_NAME, () => {
      moduleOption.rules = this._patchRules(moduleOption.rules, dev)
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
