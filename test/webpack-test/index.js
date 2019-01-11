const webpack = require('webpack')
const Module = require('module')
const path = require('path')
const VueLoaderPlugin = require('vue-loader/lib/plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const originResolveFilename = Module._resolveFilename
Module._resolveFilename = function _resolveFilename (request, parent, isMain) {
  let _request = request
  if (/^(webpack|vue-loader|postcss-loader)/.test(_request)) {
    _request = path.join(__dirname, 'node_modules', _request)
  }
  try {
    return originResolveFilename(_request, parent, isMain)
  } catch (e) {
    return originResolveFilename(request, parent, isMain)
  }
}

const FlagPlugin = require('../../index')

const test = require('tape')
test('webpack test', t => {
  webpack({
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
        flags: path.join(__dirname, './flags.js'),
        namespace: 'flags'
      }),
      new MiniCssExtractPlugin({ filename: '[name].css' })
    ]
  }, (err, stats) => {
    t.equal(err, null)
    t.equal(stats.hasErrors(), false)
    t.end()
  })
})
