const { PLUGIN_NAME, RESOLVED_FLAGS_PATH } = require('./constants')

try {
  require.resolve('vue-loader/lib/plugin')
} catch(e) {
  throw new Error(`${PLUGIN_NAME} does not support vue-loader < 15 anymore, please upgrade it.`)
}

const webpack = require('webpack')
const RuleSet = require('webpack/lib/RuleSet')
const postcssFlagsPlugin = require('./postcss-flags-plugin')
const validateOptions = require('schema-utils')

const { setOptions, pluginOptions, optionSchema } = require('./resolve-options')
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
    const schema = optionSchema(options ? options.watch : false)
    validateOptions(schema, options, PLUGIN_NAME)
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
  _addDependency (lc) {
    if (lc.loaders && lc.loaders.some(loader => loader.path === postcssLoaderPath)) {
      lc.addDependency(RESOLVED_FLAGS_PATH)
    }
  }
  apply (compiler) {
    if (!compiler.hooks) {
      throw new Error(`${PLUGIN_NAME} does not support webpack < 4 anymore, please upgrade it.`)
    }
    const webpackConfig = compiler.options
    setOptions(this.options, webpackConfig)
    const { rules } = new RuleSet(webpackConfig.module.rules)

    // attache template loader before(after) vue-loader
    const matched = {}
    this._walkRules(rules, /^vue-loader|(\/|\\|@)vue-loader/, (uses, i) => {
      matched.uses = uses
      matched.index = i
    })
    if (!matched.uses) {
      console.log(`${PLUGIN_NAME} Warning: Not found "vue-loader", please check the webpack config<module.rules>.`)
    } else {
      matched.uses.splice(matched.index, 0, {
        loader: require('path').resolve(__dirname, 'template-loader.js'),
        ident: 'vue-flags-loader-options'
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

module.exports.postcssFlagsPlugin = postcssFlagsPlugin
