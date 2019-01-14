const webpack = require('webpack')
const Module = require('module')
const path = require('path')
const VueLoaderPlugin = require('vue-loader/lib/plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const MemoryFileSystem = require('memory-fs')
const test = require('tape')

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
function readFile(compiler, name) {
  const fs = compiler.outputFileSystem;
  return fs.readFileSync(path.join(compiler.outputPath, name), 'utf8');
}
test('webpack test', t => {
  const compiler = webpack({
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
        flags: './flags.js',
        namespace: 'flags',
        files: {
          B: /a-component\.vue$/
        }
      }),
      new MiniCssExtractPlugin({ filename: '[name].css' })
    ]
  })
  compiler.outputFileSystem = new MemoryFileSystem()
  compiler.run((err, stats) => {
    t.equal(err, null)
    t.equal(stats.hasErrors(), false)
    const js = readFile(compiler, 'main.js')
    t.equal(js.indexOf('template:title_is_A') > 0, true)
    t.equal(js.indexOf('template:title_is_B'), -1)
    t.equal(js.indexOf('template:ignore_a-component_or_not'), -1)
    const css = readFile(compiler, 'main.css')
    t.equal(css.indexOf('style:A_is_enabled') > 0, true)
    t.equal(css.indexOf('style:A_is_disabled'), -1)
    t.equal(css.indexOf('style:B_is_disabled') > 0, true)
    t.end()
  })
})
