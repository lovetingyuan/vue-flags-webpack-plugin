const fcd = require('find-cache-dir')
const path = require('path')
const { name } = require('../package.json')

exports.PLUGIN_NAME = name

exports.IF_FLAG = 'v-if-flag'
exports.ELIF_FLAG = 'v-elif-flag'
exports.ELSE_FLAG = 'v-else-flag'

// vue template compiler ast defined at https://github.com/vuejs/vue/blob/dev/flow/compiler.js
exports.ELE_NODE = 1
exports.EXP_NODE = 2
exports.TXT_NODE = 3

exports.SUPPORTS_PROPERTY = '--flag'

exports.RESOLVED_FLAGS_PATH = path.join(fcd({ name }), 'resolved-flags.js')

exports.VUE_LOADER_REG = /^vue-loader|(\/|\\|@)vue-loader/
exports.VUE_LOADER_IDENT = 'vue-loader-options'
