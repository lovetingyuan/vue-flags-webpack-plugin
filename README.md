# vue-flags-webpack-plugin
Remove useless code by setting flags in .vue SFC file

[![npm version](https://img.shields.io/npm/v/vue-flags-webpack-plugin.svg)](https://www.npmjs.com/package/vue-flags-webpack-plugin)
[![Build Status](https://travis-ci.org/lovetingyuan/vue-flags-webpack-plugin.svg?branch=master)](https://travis-ci.org/lovetingyuan/vue-flags-webpack-plugin)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

### Usage

install: `npm install vue-flags-webpack-plugin -D`

options:
```javascript
{
  // plain object that only contains boolean value, required
  flags: {
    FLAG_A: true
  },
  // string that used as namespace of flags in script
  namespace: '',
  // filter resources by regex when the flag name(as key) is false
  files: {
    // RegExp or Array of RegExp to match resource absolute file slash path,
    // when the flag name is false, matched resources will be ignored
    FLAG_A: RegExp
  }
}
```

webpack config:
```javascript
const VueFlagsPlugin = require('vue-flags-webpack-plugin');
const postcssFlagsPlugin = VueFlagsPlugin.postcssFlagsPlugin;
// your flags config, should be a plain object that only contains boolean value
const flags = {
  FLAG_A: true,
  FLAG_B: false
};
module.exports = { /* your webpack config */
  module: {
    rules: [
      // other rules
      {
        test: /\.css$/, // just for example
        use: [
          'vue-style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              plugins: [postcssFlagsPlugin(flags)]
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new VueFlagsPlugin({
      flags,
      namespace: 'flags'// or omit this option
    })
  ]
};
```

vue component:
```html
<template>
  <div>
    <p v-if-flag="FLAG_A">feature a will be enabled</p>
    <p v-elif-flag="FLAG_B">feature b will be enabled</p>
    <p v-else-flag>both feature a and b will be disabled</p>
  </div>
</template>
<script>
  export default {
    data() {
      if (flags.FLAG_A) {
        return flags.FLAG_B ? 'flag bbb' : '...';
      }
    }
  }
</script>
<style>
  p { color: yellow; }
  /* use "--flag" as property name */
  @supports (--flag: FLAG_A) {
    p { color: red; }
  }
  @supports not (--flag: FLAG_B) {
    p { font-size: 12px; }
  }
</style>
```

### Caveats
- **[`postcss-loader`](https://postcss.org/) is required to support flags in css**
  - for version>=15, see: https://vue-loader.vuejs.org/guide/pre-processors.html#postcss
  - for older `vue-loader`, see: https://vue-loader-v14.vuejs.org/zh-cn/features/postcss.html (*`vue-loader` which version < 15 is deprecated, do not use it.*)
