const webpack = require('webpack')
const assert = require('assert')

const {
  PLUGIN_NAME,
  RESOLVED_FLAGS_PATH,
  VUE_LOADER_IDENT,
  VUE_LOADER_REG
} = require('./constants')
const { setOptions, validateOptions } = require('./resolve-options')
const { genError } = require('./utils')
const postcssFlagsPlugin = require('./postcss-flags-plugin')
const {
  // preTransformNode,
  _preTransformNode
  // postTransformNode,
  // staticKeys
} = require('./transform-node')

module.exports = class VueFlagsWebpackPlugin {
  constructor (options) {
    /**
     * {
     *  flags: string | {
     *    [k: string]: boolean
     *  }
     *  namespace: string
     *  watch: boolean
     *  files: {
     *    [k: string]: regexp | regexp[]
     *  }
     * }
     */
    this.options = validateOptions(options)
  }
  findVueLoader (rules) {
    // depend on implementation of `vue-loader`
    // see https://github.com/vuejs/vue-loader/blob/master/lib/plugin.js
    for (let rule of rules) {
      if (!Array.isArray(rule.use)) continue
      const index = rule.use.findIndex(({ loader, ident, options }) => {
        return VUE_LOADER_REG.test(loader) && ident === VUE_LOADER_IDENT && options
      })
      if (index > -1) {
        return [rule.use, index]
      }
    }
  }
  patchRules (rules, useVue, dev) {
    if (useVue) {
      let vueUses
      let index
      assert.doesNotThrow(
        () => {
          [vueUses, index] = this.findVueLoader(rules)
        },
        TypeError,
        `this is a bug of ${PLUGIN_NAME}, please try to upgrade it.`
      )
      const options = vueUses[index].options
      options.compilerOptions = options.compilerOptions || {}
      options.compilerOptions.modules = options.compilerOptions.modules || []
      options.compilerOptions.modules.unshift({
        preTransformNode: (ast, options) => {
          return _preTransformNode(ast, options, this.pluginOptions.flags)
        }
        // postTransformNode: (ast, options) => {
        //   postTransformNode(ast, options, this.pluginOptions, dev)
        // },
        // staticKeys
      })
      vueUses.splice(index, 0, { // prepend to vue-loader, exec after vue-loader
        loader: require.resolve('./template-loader'),
        options: { watch: this.pluginOptions.watch }
      })
    }
    // prepend ignore module pitch loader
    if (this.pluginOptions.files) {
      const { allFiles } = this.pluginOptions
      rules.unshift({
        use: [{
          loader: require.resolve('./ignore-module-loader'),
          enforce: 'post', // call pitch as soon
          options: this.pluginOptions,
          ident: 'vue-flags-plugin-option' // ident is required for watch
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

    // patch webpack rules
    let vueLoaderPath
    let VueLoaderPlugin
    let vueTemplateCompilerVersion
    try {
      vueLoaderPath = require.resolve('vue-loader')
      VueLoaderPlugin = require('vue-loader/lib/plugin')
      vueTemplateCompilerVersion = require('vue-template-compiler/package.json').version
    } catch (err) {
      if (vueLoaderPath && !VueLoaderPlugin) {
        throw genError('vue-loader < 15 is not supported, ' + err.message)
      }
    }
    const vuePlugin = VueLoaderPlugin && plugins.find(p => p.constructor === VueLoaderPlugin)
    if (vuePlugin) {
      const semver = require('semver')
      const minVersion = '2.2.0' // because `ifConditions`, see https://github.com/vuejs/vue/issues/4317
      if (semver.lt(vueTemplateCompilerVersion, minVersion)) {
        throw genError(`vue-template-compiler < ${minVersion} is not supported`)
      }
    }
    compiler.hooks.afterEnvironment.tap(PLUGIN_NAME, () => {
      // ensure patching rules after `VueLoaderPlugin`
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
