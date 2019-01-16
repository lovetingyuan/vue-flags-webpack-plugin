const webpack = require('webpack')
const RuleSet = require('webpack/lib/RuleSet')
const loaderUtils = require('loader-utils')

const { PLUGIN_NAME, RESOLVED_FLAGS_PATH } = require('./constants')
const { setOptions, pluginOptions, validateOptions } = require('./resolve-options')
const { log, requirePath } = require('./utils')
const postcssLoaderPath = requirePath('postcss-loader')
const vueLoaderPath = requirePath('vue-loader')

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
  _addDependency (lc) {
    if (lc.loaders && lc.loaders.some(l => l.path === postcssLoaderPath)) {
      lc.addDependency(RESOLVED_FLAGS_PATH)
    }
  }
  apply (compiler) {
    if (!compiler.hooks) {
      log.warn('"webpack" < 4 is not supported anymore')
    }
    const webpackConfig = compiler.options
    if (webpackConfig.plugins.filter(p => p.constructor === VueFlagsWebpackPlugin).length > 1) {
      log.error('do not apply this plugin multiple times')
      process.exit(-1)
    }
    setOptions(this.options, compiler)
    const { rules } = new RuleSet(webpackConfig.module.rules)

    // attache template loader before(after) vue-loader
    const matches = []
    const vueLoaderReg = /^vue-loader|(\/|\\|@)vue-loader/
    this._walkRules(rules, (uses, index) => {
      const loader = uses[index].loader
      if (loader && (vueLoaderReg.test(loader) || loader === vueLoaderPath)) {
        matches.push({ uses, index })
      }
    })
    if (!matches.length) {
      log.warn('not found "vue-loader" in webpack config')
    } else {
      const NS = (() => {
        try {
          return require('vue-loader/lib/plugin').NS
        } catch (e) {
          log.error('"vue-loader" < 15 is not supported anymore')
          process.exit(-1)
        }
      })()
      const templateLoaderPath = require.resolve('./template-loader')
      matches.forEach(({ uses, index }) => {
        uses.splice(index, 0, {
          loader: templateLoaderPath,
          options: { NS },
          ident: 'vue-flags-template-loader-options'
        })
      })
    }

    // attache ignore module pitch loader to the first
    if (pluginOptions.files) {
      rules.unshift({
        use: [{
          loader: require.resolve('./ignore-module-loader'),
          ident: 'vue-flags-ignore-module-loader-options'
        }],
        resourceQuery (query) {
          const { flag } = loaderUtils.parseQuery(query)
          return flag !== null
        }
      })
    }

    // replace original webpack rules
    compiler.hooks.afterEnvironment.tap(PLUGIN_NAME, () => {
      webpackConfig.module.rules = rules
    })

    // add plugins
    const plugins = []
    if (pluginOptions.watch) { // only for development
      plugins.push(new webpack.ProvidePlugin({ [pluginOptions.namespace]: RESOLVED_FLAGS_PATH }))
      compiler.hooks.compilation.tap(PLUGIN_NAME, compilation => {
        compilation.hooks.normalModuleLoader.tap(PLUGIN_NAME, (lc, m) => {
          // wait loader-runner to fill loaderContext
          process.nextTick(() => this._addDependency(lc))
        })
      })
    } else {
      plugins.push(new webpack.DefinePlugin({ [pluginOptions.namespace]: pluginOptions.flags }))
    }
    plugins.forEach(p => p.apply(compiler))
  }
}

module.exports.postcssFlagsPlugin = require('./postcss-flags-plugin')
