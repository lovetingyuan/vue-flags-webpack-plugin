const webpack = require('webpack')
const Module = require('module')
const path = require('path')
const VueLoaderPlugin = require('vue-loader/lib/plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const MemoryFileSystem = require('memory-fs')

const originResolveFilename = Module._resolveFilename
Module._resolveFilename = function _resolveFilename (request, parent, isMain) {
  let _request = request
  if (/^(webpack|vue-loader)/.test(_request)) {
    _request = path.join(__dirname, 'node_modules', _request)
  }
  try {
    return originResolveFilename(_request, parent, isMain)
  } catch (e) {
    return originResolveFilename(request, parent, isMain)
  }
}

const FlagPlugin = require('../..')
const namespace = 'vueFlagsWebpackPlugin'
function readFile(compiler, name) {
  const fs = compiler.outputFileSystem;
  return fs.readFileSync(path.join(compiler.outputPath, name), 'utf8');
}
function writeFlags(flags) {
  const flagsPath = path.resolve(__dirname, './flags.js')
  const fs = require('fs')
  fs.writeFileSync(flagsPath, 'module.exports = ' + JSON.stringify(flags))
}
const webpackConfig = (flags) => ({
  context: __dirname,
  entry: './main.js',
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              plugins: [FlagPlugin.postcssFlagsPlugin()]
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    new FlagPlugin({
      flags: flags || './flags.js',
      namespace,
      watch: false,
    }),
    new MiniCssExtractPlugin({ filename: '[name].css' })
  ]
})

module.exports = function(...args) {
  // writeFlags(flags)
  const [t, allFlags, ...args2] = args
  const expects = args2.pop()
  const flags = {
    TITLE: Math.random() > 0.5
  }
  allFlags.forEach(f => flags[f] = args2.indexOf(f) !== -1)
  const compiler = webpack(webpackConfig(flags))
  compiler.outputFileSystem = new MemoryFileSystem()
  return new Promise(resolve => {
    compiler.run((err, stats) => {
      t.equal(err, null)
      t.equal(stats.hasErrors(), false)
      const result = readFile(compiler, 'main.js')
      t.equal(result.indexOf('if-flag'), -1)
      t.equal(result.indexOf('elif-flag'), -1)
      t.equal(result.indexOf('else-flag'), -1)
      t.equal(result.indexOf('TITLETITLETITLETITLETITLE') > 0, flags.TITLE)
      t.equal(result.indexOf('NOTITLETITLETITLE') === -1, flags.TITLE)
      Object.keys(expects).forEach(k => {
        if (expects[k]) {
          t.equal(result.indexOf(k) > 0, true)
        } else {
          t.equal(result.indexOf(k), -1)
        }
      })
      resolve()
    })
  })
}

