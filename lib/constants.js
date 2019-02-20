const fcd = require('find-cache-dir')
const path = require('path')
const { name } = require('../package.json')

exports.PLUGIN_NAME = name

exports.IF_FLAG = 'v-if-flag'
exports.ELIF_FLAG = 'v-elif-flag'
exports.ELSE_FLAG = 'v-else-flag'

exports.POSTCSS_SUPPORT_PROPERTY = '--flag'

exports.RESOLVED_FLAGS_PATH = path.join(fcd({ name }), 'resolved-flags.js')
