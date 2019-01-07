const Module = require('module')
const path = require('path')
const originResolveFilename = Module._resolveFilename
Module._resolveFilename = function _resolveFilename (request, parent, isMain) {
  let _request = request
  if (/^(webpack|vue-loader|postcss-loader)/.test(_request)) {
    _request = path.join(__dirname, 'node_modules', _request)
  }
  try {
    return originResolveFilename(_request, parent, isMain)
  } catch(e) {
    return originResolveFilename(request, parent, isMain)
  }
}

const VueFlagsPlugin = require('../../')

const postcssPlugin = VueFlagsPlugin.postcssFlagsPlugin

module.exports = {
  filenameHashing: false,
  css: {
    loaderOptions: {
      postcss: {
        plugins: [postcssPlugin()]
      }
    }
  },
  configureWebpack: {
    plugins: [
      new VueFlagsPlugin({
        flags: path.resolve(__dirname, './flags.js'),
        watch: true,
        namespace: 'flags',
        files: {
          A: [/HelloWorld/, /plugins\/.+\.js$/],
        }
      })
    ],
  },
  chainWebpack(config) {
    config.module.rule('js').uses.delete('thread-loader')
  }
}
