const webpack = require('webpack')
const path = require('path')
const VueLoaderPlugin = require('vue-loader/lib/plugin')
const MemoryFileSystem = require('memory-fs')
// const Module = require('module')
// const originResolveFilename = Module._resolveFilename
// Module._resolveFilename = function _resolveFilename (request, parent, isMain) {
//   let _request = request
//   if (/^(webpack|vue-loader)/.test(_request)) {
//     _request = path.join(__dirname, 'node_modules', _request)
//   }
//   try {
//     return originResolveFilename(_request, parent, isMain)
//   } catch (e) {
//     return originResolveFilename(request, parent, isMain)
//   }
// }

const FlagPlugin = require('../..')

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
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: 'production'
      }
    }),
    new FlagPlugin({
      flags,
      namespace: 'VueFlags',
      files: {
        a: /add\.js$/
      }
    }),
    new VueLoaderPlugin(),
  ]
})

module.exports = function(flags) {
  return new Promise((resolve, reject) => {
    const compiler = webpack(webpackConfig(flags))
    const fs = compiler.outputFileSystem = new MemoryFileSystem()
    compiler.run((err, stats) => {
      if (err || stats.hasErrors()) {
        reject(err || stats.compilation.errors)
      } else {
        resolve(fs.readFileSync(path.join(compiler.outputPath, 'main.js'), 'utf8'))
      }
    })
  })
}
