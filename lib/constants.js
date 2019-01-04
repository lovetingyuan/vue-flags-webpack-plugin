const path = require('path')

exports.PLUGIN_NAME = require('../package.json').name

exports.IF_FLAG = 'v-if-flag'
exports.ELIF_FLAG = 'v-elif-flag'
exports.ELSE_FLAG = 'v-else-flag'

exports.POSTCSS_SUPPORT_PROPERTY = '--flag'

const cachePath = (() => {
  let modulePath = require.resolve('webpack')
  const list = modulePath.split(path.sep)
  const nodeModulePath = list.slice(0, list.indexOf('node_modules') + 1).join(path.sep)
  return path.resolve(nodeModulePath, '.cache', exports.PLUGIN_NAME)
})()

exports.RESOLVED_FLAGS_PATH = path.resolve(cachePath, 'resolved-flags.js')
