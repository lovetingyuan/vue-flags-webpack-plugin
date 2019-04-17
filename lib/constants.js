const fcd = require('find-cache-dir')
const path = require('path')
const { name } = require('../package.json')

module.exports = {
  PLUGIN_NAME: name,
  IF_FLAG: 'v-if-flag',
  ELIF_FLAG: 'v-elif-flag',
  ELSE_FLAG: 'v-else-flag',
  RESOLVED_FLAGS_PATH: path.join(fcd({ name }), 'resolved-flags.js'),
  // behaviour of `postTransformNode` was changed after 2.5.12
  MIN_VERSION: '2.5.12',
  // special attributes or directives working with v-*-flag
  VUE_IF_DIR: 'v-if',
  VUE_ELSE_IF_DIR: 'v-else-if',
  VUE_ELSE_DIR: 'v-else',
  VUE_SLOT_DIR: 'v-slot',
  VUE_SLOT_SCOPE: 'slot-scope',
  VUE_SLOT: 'slot', // no effects actually
  // defined by `vue-template-compiler` at https://github.com/vuejs/vue/blob/dev/flow/compiler.js
  ELE_NODE: 1,
  EXP_NODE: 2,
  TXT_NODE: 3,
  // eg: @supports (--flag: A) {}
  SUPPORTS_PROPERTY: '--flag',
  // defined by `vue-loader` at https://github.com/vuejs/vue-loader/blob/master/lib/plugin.js
  VUE_LOADER_REG: /^vue-loader|(\/|\\|@)vue-loader/,
  VUE_LOADER_IDENT: 'vue-loader-options'
}
