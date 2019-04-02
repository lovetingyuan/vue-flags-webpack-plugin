const fcd = require('find-cache-dir')
const path = require('path')
const { name } = require('../package.json')

exports.PLUGIN_NAME = name
exports.MIN_VERSION = '2.5.12' // because behaviour of `postTransformNode` was changed after 2.5.12

exports.IF_FLAG = 'v-if-flag'
exports.ELIF_FLAG = 'v-elif-flag'
exports.ELSE_FLAG = 'v-else-flag'

// v-*-flag can not be used with these attribute
exports.VUE_IF_DIR = 'v-if'
exports.VUE_ELSE_IF_DIR = 'v-else-if'
exports.VUE_ELSE_DIR = 'v-else'
exports.VUE_SLOT_DIR = 'v-slot'
// exports.VUE_PRE_DIR = 'v-pre'
exports.VUE_SLOT = 'slot'
exports.VUE_SLOT_SCOPE = 'slot-scope'

// vue template compiler ast defined at https://github.com/vuejs/vue/blob/dev/flow/compiler.js
exports.ELE_NODE = 1
exports.EXP_NODE = 2
exports.TXT_NODE = 3

exports.SUPPORTS_PROPERTY = '--flag'

exports.RESOLVED_FLAGS_PATH = /** process.env.NODE_ENV === 'TEST' ? path.join(process.cwd(), 'test/webpackresolved-flags-test.js') : */ path.join(fcd({ name }), 'resolved-flags.js')

exports.VUE_LOADER_REG = /^vue-loader|(\/|\\|@)vue-loader/
exports.VUE_LOADER_IDENT = 'vue-loader-options'
