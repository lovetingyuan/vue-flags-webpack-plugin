exports.PLUGIN_NAME = require('../package.json').name

exports.IF_FLAG = 'v-if-flag'
exports.ELIF_FLAG = 'v-elif-flag'
exports.ELSE_FLAG = 'v-else-flag'

exports.POSTCSS_SUPPORT_PROPERTY = '--flag'

// vue-loader version >= 15
if (!process.env.TEST) {
  exports.VUE_LOADER_15 = !!require('vue-loader').VueLoaderPlugin
}