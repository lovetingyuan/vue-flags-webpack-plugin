const { PLUGIN_NAME, RESOLVED_FLAGS_PATH } = require('./constants')

const webpack = require('webpack')

const RuleSet = require('webpack/lib/RuleSet')
const { log } = require('./utils')

const { setOptions, pluginOptions, validateOptions } = require('./resolve-options')
const postcssLoaderPath = (() => {
  try {
    return require.resolve('postcss-loader')
  } catch (e) {}
})()

const loaderUtils = require('loader-utils')

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
  _addDependency (lc) {
    if (lc.loaders && lc.loaders.some(loader => loader.path === postcssLoaderPath)) {
      lc.addDependency(RESOLVED_FLAGS_PATH)
    }
  }
  apply (compiler) {
    if (!compiler.hooks) {
      log.warn('webpack < 4 is not supported anymore')
    }
    const webpackConfig = compiler.options
    if (webpackConfig.plugins.filter(p => p.constructor === VueFlagsWebpackPlugin).length > 1) {
      log.error(`do not apply ${PLUGIN_NAME} multiple times`, true)
      return
    }
    setOptions(this.options, webpackConfig, compiler)
    const { rules } = new RuleSet(webpackConfig.module.rules)

    // attache template loader before(after) vue-loader
    const matches = []
    this._walkRules(rules, /^vue-loader|(\/|\\|@)vue-loader/, (uses, index) => {
      matches.push({ uses, index })
    })
    if (!matches.length) {
      log.warn('not found "vue-loader" in webpack config')
    } else {
      try {
        require.resolve('vue-loader/lib/plugin')
      } catch (e) {
        log.error('vue-loader < 15 is not supported anymore', true)
      }
      const templateLoaderPath = require.resolve('./template-loader')
      matches.forEach(({ uses, index }) => {
        uses.splice(index, 0, {
          loader: templateLoaderPath,
          ident: 'vue-flags-loader-options'
        })
      })
    }

    // attache ignore module pitch loader to the first
    if (pluginOptions.files) {
      rules.unshift({
        use: [{
          loader: require.resolve('./ignore-module-loader'),
          ident: 'ignore-module-loader-options'
        }],
        resourceQuery (query) {
          const { flag } = loaderUtils.parseQuery(query)
          return flag !== null
        }
      })
      // (new (require('./ignore-files-plugin'))).apply(compiler)
    }
    webpackConfig.module.rules = rules

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
