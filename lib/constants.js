const path = require('path')
const findCacheDir = require('find-cache-dir')

exports.PLUGIN_NAME = require('../package.json').name

exports.IF_FLAG = 'v-if-flag'
exports.ELIF_FLAG = 'v-elif-flag'
exports.ELSE_FLAG = 'v-else-flag'

exports.POSTCSS_SUPPORT_PROPERTY = '--flag'

const cacheDir = findCacheDir({ name: exports.PLUGIN_NAME })

exports.RESOLVED_FLAGS_PATH = path.join(cacheDir, 'resolved-flags.js')
