const webpack = require('webpack')

const { PLUGIN_NAME, RESOLVED_FLAGS_PATH, VUE_LOADER_IDENT } = require('./constants')
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
  findVueLoader (rules) { // depend on implementation of `vue-loader`
    const vueLoaderReg = /^vue-loader|(\/|\\|@)vue-loader/
    for (let rule of rules) {
      if (!Array.isArray(rule.use)) continue
      const index = rule.use.findIndex(({ loader, ident, options }) => {
        return vueLoaderReg.test(loader) && ident === VUE_LOADER_IDENT && options
      })
      if (index > -1) {
        return [rule.use, index]
      }
    }
  }
  patchRules (rules, useVue, dev) {
    if (useVue) {
      const [ uses, index ] = this.findVueLoader(rules)
      const options = uses[index].options
      options.compilerOptions = options.compilerOptions || {}
      options.compilerOptions.modules = options.compilerOptions.modules || []
      options.compilerOptions.modules.unshift({
        preTransformNode,
        postTransformNode: (ast, options) => {
          postTransformNode(ast, options, this.pluginOptions, dev)
        }
      })
      if (this.pluginOptions.watch) {
        uses.splice(index, 0, { // prepend to vue-loader, exec after vue-loader
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
          ident: 'vue-flags-plugin-option' // ident is required
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
    } catch (err) {
      if (vueLoaderPath && !VueLoaderPlugin) {
        throw genError('vue-loader < 15 is not supported, ' + err.message)
      }
    }
    const vuePlugin = VueLoaderPlugin && plugins.find(p => p.constructor === VueLoaderPlugin)
    compiler.hooks.afterEnvironment.tap(PLUGIN_NAME, () => {
      this.patchRules(moduleOption.rules, !!vuePlugin, dev)
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
