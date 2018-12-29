const { PLUGIN_NAME, RESOLVED_FLAGS_PATH } = require('./constants')

if (!require('vue-loader').VueLoaderPlugin) {
  throw new Error(`${PLUGIN_NAME} does not support vue-loader < 15 anymore, please upgrade it.`)
}

const isPlainObject = require('lodash.isplainobject')
// const loaderUtils = require('loader-utils')
const webpack = require('webpack')
const RuleSet = require('webpack/lib/RuleSet')
const IgnoreFilesPlugin = require('./ignore-files-plugin')
const postcssFlagsPlugin = require('./postcss-flags-plugin')

const { setOptions, flagsInfo, pluginOptions } = require('./resolve-options')
const postcssLoaderPath = require.resolve('postcss-loader')

const transformTemplate = require('./transform-template')

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
  _addDependency (lc) {
    if (lc.loaders && lc.loaders.some(loader => loader.path === postcssLoaderPath)) {
      lc.addDependency(RESOLVED_FLAGS_PATH)
    }
    // if (lc['vue-loader'] && lc.resourceQuery && lc.resourceQuery[0] === '?') {
    //   const { vue, type } = loaderUtils.parseQuery(lc.resourceQuery)
    //   if (vue && type === 'template') {
    //     lc.addDependency(RESOLVED_FLAGS_PATH)
    //   }
    // }
  }
  _patchCompiler (vueLoader) {
    vueLoader.options = vueLoader.options || {}
    const compiler = vueLoader.options.compiler || require('vue-template-compiler')
    const { compile: _compile, ssrCompile: _ssrCompile } = compiler
    if (_compile) {
      compiler.compile = function compile (template, options) {
        try {
          const compiledTemplate = transformTemplate(template, flagsInfo.flags)
          return _compile.call(this, compiledTemplate, options)
        } catch (e) {
          const result = _compile.call(this, template, options)
          const errors = result.errors ? result.errors.concat(e.message) : [e.message]
          result.errors = [...new Set(errors)]
          return result
        }
      }
    }
    if (_ssrCompile) {
      compiler.ssrCompile = function ssrCompile (template, options) {
        try {
          const compiledTemplate = transformTemplate(template, flagsInfo.flags)
          return _ssrCompile.call(this, compiledTemplate, options)
        } catch (e) {
          const result = _ssrCompile.call(this, template, options)
          const errors = result.errors ? result.errors.concat(e.message) : [e.message]
          result.errors = [...new Set(errors)]
          return result
        }
      }
    }
    vueLoader.options.compiler = compiler
  }
  apply (compiler) {
    if (!compiler.hooks) {
      throw new Error(`${PLUGIN_NAME} does not support webpack < 4 anymore, please upgrade it.`)
    }
    const webpackConfig = compiler.options
    const { rules } = new RuleSet(webpackConfig.module.rules)
    let foundVueLoader
    this._walkRules(rules, /^vue-loader|(\/|\\|@)vue-loader/, (uses, i) => {
      foundVueLoader = true
      uses.push({
        loader: require('path').resolve(__dirname, 'template-loader.js'),
        ident: 'vue-flags-loader-options'
      })
      // or this._patchCompiler(uses[i])
    })
    if (!foundVueLoader) {
      throw new Error(`${PLUGIN_NAME} Error: Not found "vue-loader", please check the webpack config<module.rules>.`)
    }
    webpackConfig.module.rules = rules

    // add plugins
    const plugins = []
    if (pluginOptions.watch) { // only for development
      plugins.push(new webpack.ProvidePlugin({ [pluginOptions.namespace]: RESOLVED_FLAGS_PATH }))
    } else {
      plugins.push(new webpack.DefinePlugin({ [pluginOptions.namespace]: flagsInfo.flags }))
    }
    if (isPlainObject(pluginOptions.files)) {
      plugins.push(new IgnoreFilesPlugin())
    }
    pluginOptions.watch && compiler.hooks.compilation.tap(PLUGIN_NAME, compilation => {
      compilation.hooks.normalModuleLoader.tap(PLUGIN_NAME, (lc, m) => {
        process.nextTick(() => this._addDependency(lc))
      })
    })
    plugins.forEach(p => p.apply(compiler))
  }
}

module.exports.postcssFlagsPlugin = postcssFlagsPlugin
