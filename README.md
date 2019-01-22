# vue-flags-webpack-plugin
Remove useless code by setting flags in .vue SFC file(works with [`vue-loader`](https://github.com/vuejs/vue-loader) >= 15 and `webpack` >= 4)

[![npm version](https://img.shields.io/npm/v/vue-flags-webpack-plugin.svg)](https://www.npmjs.com/package/vue-flags-webpack-plugin)
[![Build Status](https://travis-ci.org/lovetingyuan/vue-flags-webpack-plugin.svg?branch=master)](https://travis-ci.org/lovetingyuan/vue-flags-webpack-plugin)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

### usage

install:
```bash
npm install vue-flags-webpack-plugin -D
```

options:
* `flags` (object|string, required)
  + a plain object that contains flags value(boolean) or a file(directory) path that exports flags object.
* `namespace` (string, required)
  + used as namespace of flags in JavaScript.
* `watch` (boolean, default: false)
  + should only be used in development mode.
  + support to modify flags and reload your app when this option is `true`.
  + `flags` must be a file(directory) path when this options is `true`.
* `files` (object, default: null)
  + a plain object that contains flag name and regular expression of files.
  + when flag is `false`, the files matched will be ignored.

### example
flags file: `./app-flags.js`
```javascript
module.exports = {
  FLAG_A: true,
  FLAG_B: false,
}
```

webpack config:
```javascript
const VueFlagsPlugin = require('vue-flags-webpack-plugin');
const postcssFlagsPlugin = VueFlagsPlugin.postcssFlagsPlugin;
/* your webpack config */
module.exports = {
  module: {
    rules: [
      // ...other rules
      {
        test: /\.css$/,
        use: [
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              plugins: [postcssFlagsPlugin()]
            }
          }
        ]
      }
    ]
  },
  plugins: [
    // ...other plugins
    new VueFlagsPlugin({
      flags: './app-flags.js',
      namespace: 'FLAGS',
      watch: process.env.NODE_ENV === 'development',
      files: {
        FLAG_B: [/b-related-module\.js$/]
      }
    })
  ]
};
```

vue component:
```html
<template>
  <div>
    <p v-if-flag="FLAG_A">feature a will be enabled</p>
    <p v-elif-flag="FLAG_B">{{msg}}</p>
    <p v-else-flag>both feature a and b will be disabled</p>
  </div>
</template>

<script>
  import moduleB from './b-related-module';
  export default {
    data() {
      return {
        msg: FLAGS.FLAG_B ? 'flag b enable' : '...';
      }
    },
    mounted() {
      // if FLAG_B is false, moduleB is undefined
      if (moduleB) { moduleB() }
    }
  }
</script>

<!-- could also use sc(a)ss, less, stylus, etc. -->
<style>
  p { color: yellow; }
  /**
    You must use "--flag" as custom property name
    see @supports: https://developer.mozilla.org/en-US/docs/Web/CSS/@supports
  */
  @supports (--flag: FLAG_A) {
    p { color: red; }
  }
  @supports not (--flag: FLAG_B) {
    p { font-size: 12px; }
  }
</style>
```

### License
MIT
