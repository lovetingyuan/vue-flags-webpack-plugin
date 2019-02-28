const webpack = require('webpack')
const RuleSet = require('webpack/lib/RuleSet')

const { PLUGIN_NAME, RESOLVED_FLAGS_PATH } = require('./constants')
const { setOptions, validateOptions } = require('./resolve-options')
const { genError } = require('./utils')
const postcssFlagsPlugin = require('./postcss-flags-plugin')
const { preTransformNode, postTransformNode } = require('./transform-node')

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
  findVueRule (rules, vueLoaderPath) {
    const vueMatches = []
    const vueLoaderReg = /^vue-loader|(\/|\\|@)vue-loader/
    rules.forEach(rule => {
      // only handle normal rule
      if (rule.enforce || !rule.resource) return
      if (!(rule.resource('foo.vue') || rule.resource('foo.vue.html'))) {
        return
      }
      // not support use function as rule.use
      if (!Array.isArray(rule.use)) {
        return
      }
      const vueUseIndex = rule.use.findIndex(u => {
        return vueLoaderReg.test(u.loader) || u.loader === vueLoaderPath
      })
      if (vueUseIndex !== -1) {
        vueMatches.push({
          uses: rule.use,
          index: vueUseIndex
        })
      }
    })
    return vueMatches
  }
  patchRules (rawRules, dev, vueLoaderPath) {
    const { rules } = new RuleSet(rawRules)
    if (vueLoaderPath) {
      const vueMatches = this.findVueRule(rules, vueLoaderPath)
      if (!vueMatches.length) {
        throw genError('No matching "use"(not support function) for vue-loader is found in webpack config')
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
          preTransformNode,
          postTransformNode: (ast, options) => {
            postTransformNode(ast, options, this.pluginOptions, dev)
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
          ident: 'vue-flags-ignore-module-loader-option' // ident is required!!
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
