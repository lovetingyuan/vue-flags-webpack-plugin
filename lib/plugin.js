const { PLUGIN_NAME, RESOLVED_FLAGS_PATH } = require('./constants')

if (!require('vue-loader').VueLoaderPlugin) {
  throw new Error(`${PLUGIN_NAME} does not support vue-loader < 15 anymore, please upgrade it.`)
}

// const isPlainObject = require('lodash.isplainobject')
// const loaderUtils = require('loader-utils')
const webpack = require('webpack')
const RuleSet = require('webpack/lib/RuleSet')
// const IgnoreFilesPlugin = require('./ignore-files-plugin')
const postcssFlagsPlugin = require('./postcss-flags-plugin')

const { setOptions, pluginOptions } = require('./resolve-options')
const postcssLoaderPath = require.resolve('postcss-loader')

const transformTemplate = require('./transform-template')

// const loaderUtils = require('loader-utils')
const RawModule = require('webpack/lib/RawModule')

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
    if (pluginOptions.files.some(v => v.test(lc.resourcePath))) {
      lc.addDependency(RESOLVED_FLAGS_PATH)
    }
    // if (lc.resourceQuery && lc.resourceQuery[0] === '?') {
    //   const { vue, type, flag } = loaderUtils.parseQuery(lc.resourceQuery)
    //   if (vue && type === 'template') {
    //     lc.addDependency(RESOLVED_FLAGS_PATH)
    //   }
    //   if (flag) {
    //     lc.addDependency(RESOLVED_FLAGS_PATH)
    //   }
    // }
  }
  _patchCompiler (vueLoader) {
    vueLoader.options = vueLoader.options || {}
    // console.log(vueLoader.options)
    const compiler = vueLoader.options.compiler || require('vue-template-compiler')
    const { compile: _compile, ssrCompile: _ssrCompile } = compiler
    if (_compile) {
      compiler.compile = function compile (template, options) {
        try {
          const compiledTemplate = transformTemplate(template, pluginOptions.flags)
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
          const compiledTemplate = transformTemplate(template, pluginOptions.flags)
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
    setOptions(this.options, webpackConfig)
    const { rules } = new RuleSet(webpackConfig.module.rules)
    let foundVueLoader
    this._walkRules(rules, /^vue-loader|(\/|\\|@)vue-loader/, (uses, i) => {
      foundVueLoader = true
      uses.push({
        loader: require('path').resolve(__dirname, 'template-loader.js'),
        ident: 'vue-flags-loader-options'
      })
      // this._patchCompiler(uses[i])
    })
    if (!foundVueLoader) {
      throw new Error(`${PLUGIN_NAME} Error: Not found "vue-loader", please check the webpack config<module.rules>.`)
    }
    // rules.push({
    //   use: [{
    //     loader: require.resolve('./template-loader')
    //   }],
    //   resourceQuery(query) {
    //     if (query[0] !== '?') return false
    //     const { vue, type } = loaderUtils.parseQuery(query)
    //     return vue && type === 'template'
    //   },
    // })
    // rules.unshift({
    //   use: [{
    //     loader: require.resolve('./ignore-module-loader'),
    //   }],
    //   resourceQuery(query) {
    //     if (query[0] !== '?') return false
    //     const { flag } = loaderUtils.parseQuery(query)
    //     return flag !== null
    //   },
    // })
    webpackConfig.module.rules = rules
    // add plugins
    const plugins = []
    if (this.options.watch) { // only for development
      plugins.push(new webpack.ProvidePlugin({ [pluginOptions.namespace]: RESOLVED_FLAGS_PATH }))
    } else {
      plugins.push(new webpack.DefinePlugin({ [pluginOptions.namespace]: pluginOptions.flags }))
    }
    // if (isPlainObject(this.options.files)) {
    //   plugins.push(new IgnoreFilesPlugin())
    // }
    this.options.watch && compiler.hooks.compilation.tap(PLUGIN_NAME, compilation => {
      compilation.hooks.normalModuleLoader.tap(PLUGIN_NAME, (lc, m) => {
        // wait loader-runner to fill loaderContext
        process.nextTick(() => this._addDependency(lc))
      })
    })
    // const emptyModulePath = JSON.stringify(require.resolve('./empty-module'))

    pluginOptions.files.length && compiler.hooks.normalModuleFactory.tap(PLUGIN_NAME, (nmf) => {
      nmf.hooks.createModule.tap(PLUGIN_NAME, (resolved) => {
        if (pluginOptions.files.some(v => v.test(resolved.resource))) {
          return new RawModule(`module.exports = null`)
        }
      })
    })
    plugins.forEach(p => p.apply(compiler))
  }
}

module.exports.postcssFlagsPlugin = postcssFlagsPlugin
