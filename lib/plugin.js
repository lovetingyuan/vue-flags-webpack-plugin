const { PLUGIN_NAME, RESOLVED_FLAGS_PATH } = require('./constants')

if (!require('vue-loader').VueLoaderPlugin) {
  throw new Error(`${PLUGIN_NAME} does not support vue-loader < 15 anymore, please upgrade it.`)
}

const isPlainObject = require('lodash.isplainobject')
const webpack = require('webpack')
const RuleSet = require('webpack/lib/RuleSet')
const path = require('path')
const IgnorePlugin = require('./ignore-files-plugin')
const postcssFlagsPlugin = require('./postcss-flags-plugin')

const { setOptions, flagsInfo, pluginOptions } = require('./resolve-options')
const postcssLoaderPath = require.resolve('postcss-loader')

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
    setOptions(options)
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
    if (!compiler.hooks) {
      throw new Error(`${PLUGIN_NAME} does not support webpack < 4 anymore, please upgrade it.`)
    }
    const webpackConfig = compiler.options
    const { rules } = new RuleSet(webpackConfig.module.rules)
    let foundVueLoader
    this._walkRules(rules, /^vue-loader|(\/|\\|@)vue-loader/, (uses) => {
      uses.push({
        loader: path.resolve(__dirname, 'template-loader.js'),
        ident: 'vue-flags-loader-options'
      })
      foundVueLoader = true
    })
    if (!foundVueLoader) {
      throw new Error(`${PLUGIN_NAME} Error: Not found "vue-loader", please check the webpack config<module.rules>.`)
    }
    webpackConfig.module.rules = rules
    // add plugins
    const plugins = []
    if (pluginOptions.watch) { // only for development
      plugins.push(new webpack.ProvidePlugin({
        [pluginOptions.namespace]: RESOLVED_FLAGS_PATH
      }))
    } else {
      plugins.push(new webpack.DefinePlugin({
        [pluginOptions.namespace]: flagsInfo.flags
      }))
    }
    if (isPlainObject(pluginOptions.files)) {
      plugins.push(new IgnorePlugin())
    }
    plugins.forEach(p => p.apply(compiler))

    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.normalModuleLoader.tap(PLUGIN_NAME, (lc, m) => {
        if (pluginOptions.watch) {
          process.nextTick(() => {
            if (lc.loaders && lc.loaders.some(loader => {
              return loader.path === postcssLoaderPath
            })) {
              lc.addDependency(RESOLVED_FLAGS_PATH)
            }
          })
        }
      })
    })
  }
}

module.exports.postcssFlagsPlugin = postcssFlagsPlugin
