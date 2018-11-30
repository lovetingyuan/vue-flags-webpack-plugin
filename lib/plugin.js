const { PLUGIN_NAME } = require('./constants')
const isPlainObject = require('lodash.isplainobject')
const webpack = require('webpack')
const RuleSet = require('webpack/lib/RuleSet')
const path = require('path')
// const fs = require('fs-extra')
const IgnorePlugin = require('./ignore-files-plugin')
// const resolvedFlagsFilePath = path.resolve('.flags-webpack-plugin/flags.json')
const postcssFlagsPlugin = require('./postcss-flags-plugin')

const postcssProcessor = require('postcss/lib/processor')
const originNormalize = postcssProcessor.prototype.normalize
postcssProcessor.prototype.normalize = function normalize (plugins) {
  plugins.push(postcssFlagsPlugin)
  return originNormalize.call(this, plugins)
}

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
    if (!options) return
    if (!isPlainObject(options.flags)) {
      throw new Error(`${PLUGIN_NAME} Error: "flags" in options is not a plain object`)
    }
    if (typeof options.namespace !== 'string' || !options.namespace) {
      console.warn('Use default namespace: "flags".')
      options.namespace = 'flags'
    }
    // fs.ensureDirSync(resolvedFlagsFilePath);
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
  apply (compiler) {
    const { flags, namespace, files } = this.options
    if (!Object.keys(flags).length) return
    const webpackConfig = compiler.options
    const { rules } = new RuleSet(webpackConfig.module.rules)
    let foundVueLoader
    this._walkRules(rules, /^vue-loader|(\/|\\|@)vue-loader/, (uses) => {
      uses.push({
        loader: path.resolve(__dirname, 'template-loader.js'),
        options: { flags },
        ident: 'vue-flags-loader-options'
      })
      foundVueLoader = true
    })
    if (!foundVueLoader) {
      throw new Error(`${PLUGIN_NAME} Error: Not found "vue-loader", please check the webpack config<module.rules>.`)
    }
    // let foundCssLoader
    // this._walkRules(rules, new RegExp(`^css-loader|${require.resolve('css-loader')}`), (uses, i) => {
    //   if (typeof uses[i].options.importLoaders === 'number') {
    //     uses[i].options.importLoaders++
    //   } else {
    //     uses[i].options.importLoaders = 1
    //   }
    //   uses.splice(i + 1, 0, {
    //     loader: 'postcss-loader',
    //     options: {
    //       plugins: [postcssFlagsPlugin]
    //     }
    //   })
    //   foundCssLoader = true
    // })
    // if (!foundCssLoader) {
    //   throw new Error(`${PLUGIN_NAME} Error: Not found "css-loader", please check the webpack config<module.rules>.`)
    // }
    webpackConfig.module.rules = rules
    // add plugins
    const plugins = []
    if (this.options.watch) { // only for development
      plugins.push(new webpack.ProvidePlugin({
        [namespace]: flags
      }))
    } else {
      plugins.push(new webpack.DefinePlugin({
        [namespace]: JSON.stringify(flags)
      }))
    }
    if (isPlainObject(files)) {
      plugins.push(new IgnorePlugin({ files, flags }))
    }
    if (compiler.hooks) {
      plugins.forEach(p => p.apply(compiler))
    } else {
      compiler.apply.apply(compiler, plugins) // eslint-disable-line
    }
  }
}

module.exports.postcssFlagsPlugin = postcssFlagsPlugin
