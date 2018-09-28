const Module = require('module')
const path = require('path')
const originResolveFilename = Module._resolveFilename
Module._resolveFilename = function _resolveFilename (request, parent, isMain) {
  if (/^(webpack|vue-loader)/.test(request)) {
    request = path.join(__dirname, 'node_modules', request)
  }
  return originResolveFilename(request, parent, isMain)
}

const VueFlagsPlugin = require('../../')
const postcssPlugin = VueFlagsPlugin.postcssFlagsPlugin
const flags = {
  featureA: true,
  featureB: false
}
module.exports = {
  filenameHashing: false,
  css: {
    loaderOptions: {
      postcss: {
        plugins: [postcssPlugin(flags)]
      }
    }
  },
  configureWebpack: {
    plugins: [
      new VueFlagsPlugin({
        flags
      })
    ]
  }
}
