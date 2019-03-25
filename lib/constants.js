const fcd = require('find-cache-dir')
const path = require('path')
const { name } = require('../package.json')

exports.PLUGIN_NAME = name

exports.IF_FLAG = 'v-if-flag'
exports.ELIF_FLAG = 'v-elif-flag'
exports.ELSE_FLAG = 'v-else-flag'

// v-*-flag can not be used with these directives
exports.VUE_IF_DIR = 'v-if'
exports.VUE_ELSE_IF_DIR = 'v-else-if'
exports.VUE_ELSE_DIR = 'v-else'
exports.VUE_SLOT_DIR = 'v-slot'
exports.VUE_PRE_DIR = 'v-pre'

exports.FORBIDDEN_DIRS = [
  exports.VUE_IF_DIR,
  exports.VUE_ELSE_IF_DIR,
  exports.VUE_ELSE_DIR,
  exports.VUE_SLOT_DIR,
  exports.VUE_PRE_DIR
]

// vue template compiler ast defined at https://github.com/vuejs/vue/blob/dev/flow/compiler.js
exports.ELE_NODE = 1
exports.EXP_NODE = 2
exports.TXT_NODE = 3

exports.SUPPORTS_PROPERTY = '--flag'

exports.RESOLVED_FLAGS_PATH = path.join(fcd({ name }), 'resolved-flags.js')

exports.VUE_LOADER_REG = /^vue-loader|(\/|\\|@)vue-loader/
exports.VUE_LOADER_IDENT = 'vue-loader-options'
