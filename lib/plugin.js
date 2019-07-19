const assert = require('assert')
const webpack = require('webpack')

const {
  PLUGIN_NAME,
  RESOLVED_FLAGS_PATH,
  VUE_LOADER_IDENT,
  VUE_LOADER_REG,
  MIN_VERSION
} = require('./constants')
const { setOptions, validateOptions } = require('./resolve-options')
const { genError } = require('./utils')
const postcssFlagsPlugin = require('./postcss-flags-plugin')
const {
  preTransformNode,
  postTransformNode,
  staticKeys
} = require('./transform-node')

module.exports = class VueFlagsWebpackPlugin {
  constructor (options) {
    /**
     * {
     *  flags: string | string[] | {
     *    [k: string]: boolean
     *  }
     *  namespace: string
     *  watch: boolean
     *  ignoreFiles: {
     *    [k: string]: RegExp | RegExp[]
     *  }
     * }
     */
    this.options = validateOptions(options)
  }

  findVueLoader (rules) {
    // depend on implementation of `vue-loader`
    // see https://github.com/vuejs/vue-loader/blob/master/lib/plugin.js
    for (const rule of rules) {
      if (!Array.isArray(rule.use)) continue
      const index = rule.use.findIndex(({ loader, ident, options }) => {
        return VUE_LOADER_REG.test(loader) && ident === VUE_LOADER_IDENT && options
      })
      if (index > -1) {
        return [rule.use, index]
      }
    }
  }

  useVue (plugins) {
    let vueLoader
    let VueLoaderPlugin
    try {
      vueLoader = require('vue-loader')
      VueLoaderPlugin = require('vue-loader/lib/plugin')
    } catch (err) {
      if (vueLoader && !VueLoaderPlugin) {
        throw genError('vue-loader < 15 is not supported, ' + err.message)
      }
      return false
    }
    const useVue = !!plugins.find(p => p.constructor === VueLoaderPlugin)
    if (useVue) {
      require.resolve('vue-template-compiler')
      const vueCompilerVersion = require('vue-template-compiler/package.json').version
      const semver = require('semver')
      if (semver.lt(vueCompilerVersion, MIN_VERSION)) {
        throw genError(`vue-template-compiler < ${MIN_VERSION} is not supported`)
      }
    }
    return useVue
  }

  patchRules (webpackConfig) {
    const { module: { rules }, plugins } = webpackConfig
    if (this.useVue(plugins)) {
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
        staticKeys,
        preTransformNode,
        postTransformNode: (ast, options) => {
          postTransformNode(ast, options, this.pluginOptions)
        }
      })
      // prepend to vue-loader, exec after vue-loader
      if (this.pluginOptions.watch) {
        vueUses.splice(index, 0, {
          loader: require.resolve('./template-loader')
        })
      }
    }
    // prepend ignore module pitch loader
    if (this.pluginOptions.ignoreFiles) {
      const { allFiles } = this.pluginOptions
      allFiles.length && rules.unshift({
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
    const { plugins, mode, context, watchOptions } = compiler.options
    if (plugins.filter(p => p.constructor === VueFlagsWebpackPlugin).length > 1) {
      throw genError('Sorry, this plugin can not be used multiple times')
    }
    this.pluginOptions = setOptions(this.options, context, watchOptions, mode === 'development')
    postcssFlagsPlugin.pluginOptions = this.pluginOptions

    // patch webpack rules
    compiler.hooks.afterEnvironment.tap(PLUGIN_NAME, () => {
      // ensure patching rules after `VueLoaderPlugin`
      this.patchRules(compiler.options)
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
