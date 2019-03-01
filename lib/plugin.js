const webpack = require('webpack')

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
  patchRules (rules, dev, useVue) {
    if (useVue) {
      let vueUseIndex
      const vueLoaderReg = /^vue-loader|(\/|\\|@)vue-loader/
      const vueRule = rules.find(rule => {
        // only handle normal rule with resource condition
        if (rule.enforce || !rule.resource) return
        // can not use `resource()` to perform check because vue-loader #1201
        // not support use function as rule.use
        if (!Array.isArray(rule.use)) return
        const useIndex = rule.use.findIndex(u => vueLoaderReg.test(u.loader))
        if (useIndex !== -1) {
          vueUseIndex = useIndex
          return true
        }
      })
      const vueLoader = vueRule.use[vueUseIndex]
      vueLoader.options = vueLoader.options || {}
      // https://github.com/vuejs/vue/tree/dev/packages/vue-template-compiler#options
      vueLoader.options.compilerOptions = vueLoader.options.compilerOptions || {}
      if (!vueLoader.options.compilerOptions.modules) {
        vueLoader.options.compilerOptions.modules = []
      }
      // https://github.com/vuejs/vue/blob/dev/flow/compiler.js#L47
      vueLoader.options.compilerOptions.modules.unshift({
        preTransformNode,
        postTransformNode: (ast, options) => {
          postTransformNode(ast, options, this.pluginOptions, dev)
        }
      })
      if (this.pluginOptions.watch) {
        vueRule.use.splice(vueUseIndex, 0, { // prepend to vue-loader, exec after vue-loader
          loader: require.resolve('./template-loader')
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
          ident: 'vue-flags-ignore-module-loader-option' // ident is required!!
        }],
        resource (resourcePath) {
          return allFiles.some(v => v.test(resourcePath))
        }
      })
    }
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
    let vueLoaderPath
    let VueLoaderPlugin
    try {
      vueLoaderPath = require.resolve('vue-loader')
      VueLoaderPlugin = require('vue-loader/lib/plugin')
    } catch (e) {
      if (vueLoaderPath && !VueLoaderPlugin) {
        throw genError('vue-loader < 15 is not supported, ' + e.message)
      }
    }
    const vuePlugin = VueLoaderPlugin && plugins.find(p => p.constructor === VueLoaderPlugin)
    if (vuePlugin) {
      if (plugins.indexOf(vuePlugin) > plugins.indexOf(this)) {
        throw genError('Please use "VueLoaderPlugin" before ' + PLUGIN_NAME)
      }
    }
    compiler.hooks.afterEnvironment.tap(PLUGIN_NAME, () => {
      this.patchRules(moduleOption.rules, dev, vuePlugin)
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
