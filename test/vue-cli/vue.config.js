const Module = require('module')
const path = require('path')
const originResolveFilename = Module._resolveFilename
Module._resolveFilename = function _resolveFilename (request, parent, isMain) {
  if (/^(webpack|vue-loader|schema-utils|chokidar|postcss-loader|vue-template-compiler)/.test(request)) {
    request = path.join(__dirname, 'node_modules', request)
  }
  return originResolveFilename(request, parent, isMain)
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
        files: {
          A: [/HelloWorld/]
        }
      })
    ],
  }
}
