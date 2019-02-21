const webpack = require('webpack')
const RuleSet = require('webpack/lib/RuleSet')

const { PLUGIN_NAME, RESOLVED_FLAGS_PATH } = require('./constants')
const { setOptions, validateOptions } = require('./resolve-options')
const { genError } = require('./utils')
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
  walkRules (rules, cb) {
    for (let rule of rules) {
      if (rule.use) {
        for (let i = 0; i < rule.use.length; i++) {
          cb(rule.use, i)
        }
      }
      if (rule.oneOf) {
        this.walkRules(rule.oneOf, cb)
      }
      if (rule.rules) {
        this.walkRules(rule.rules, cb)
      }
    }
  }
  patchRules (rawRules, dev, vueLoaderPath) {
    const { rules } = new RuleSet(rawRules)
    if (vueLoaderPath) {
      const vueMatches = []
      const vueLoaderReg = /^vue-loader|(\/|\\|@)vue-loader/
      this.walkRules(rules, (uses, index) => {
        const loader = uses[index].loader
        if (vueLoaderReg.test(loader) || loader === vueLoaderPath) {
          vueMatches.push({ uses, index })
        }
      })
      if (!vueMatches.length) {
        throw genError('No matching use for vue-loader is found in webpack config')
      }
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
            loader: require.resolve('./template-loader')
          })
        }
      })
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
      throw genError('webpack < 4 is not supported')
    }
    const { plugins, mode, context, module: moduleOption, watchOptions } = compiler.options
    const dev = mode === 'development'
    if (plugins.filter(p => p.constructor === VueFlagsWebpackPlugin).length > 1) {
      throw genError('This plugin can not be used multiple times')
    }
    this.pluginOptions = setOptions(this.options, context, watchOptions, dev)
    postcssFlagsPlugin.pluginOptions = this.pluginOptions
    // replace original webpack rules
    try {
      var vueLoaderPath = require.resolve('vue-loader')
      var vueLoaderPlugin = require('vue-loader/lib/plugin')
    } catch (e) {
      if (vueLoaderPath && !vueLoaderPlugin) {
        throw genError('vue-loader < 15 is not supported, ' + e.message)
      }
    }
    const useVue = vueLoaderPlugin && plugins.find(p => p.constructor === vueLoaderPlugin)
    compiler.hooks.afterEnvironment.tap(PLUGIN_NAME, () => {
      moduleOption.rules = this.patchRules(moduleOption.rules, dev, useVue && vueLoaderPath)
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
