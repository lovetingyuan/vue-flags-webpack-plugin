# vue-flags-webpack-plugin
Remove useless code by setting flags(toggles) in .vue SFC file(works with [`vue-loader`](https://github.com/vuejs/vue-loader) >= 15 and `webpack` >= 4)

[![npm version](https://img.shields.io/npm/v/vue-flags-webpack-plugin.svg)](https://www.npmjs.com/package/vue-flags-webpack-plugin)
[![Build Status](https://travis-ci.org/lovetingyuan/vue-flags-webpack-plugin.svg?branch=master)](https://travis-ci.org/lovetingyuan/vue-flags-webpack-plugin)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

### usage

install:
```bash
npm install vue-flags-webpack-plugin -D
```

options:
* `flags` ({[k: string]: boolean} | string, required)

  a plain object that contains flags value(boolean) or a file path that exports flags object.
  ```javascript
  flags: {
    FLAG_A: true,
    FLAG_B: false,
  }
  // or
  flags: './config/allFlags.js'
  ```
* `namespace` (string, required)

  used as namespace of flags in JavaScript, must be a valid variable name.
* `watch` (boolean, default: false)

  Support to modify flags and reload your app when this option is `true`.

  Set `true` ONLY in development mode, eg: `watch: process.env.NODE_ENV === 'development'`.

  Note that `flags` must be a file path when this options is `true`.
* `ignoreFiles` ({[k: string]: RegExp | RegExp[]})

  A plain object that uses flag name or expression as key and regexp as value.

  Modules(absolute path) matched by the regexps will be ignored when the value of flags is `false`.
  ```javascript
  {
    // if FLAG_A is false, a.js will be ignored,
    'FLAG_A': [/a\.js$/],
    // if FLAG_A is false or FLAG_B is true, a-b.js will be ignored
    'FLAG_A && !FLAG_B': [/a-b\.js$/],
  }
  ```

### example
flags file: `./allFlags.js`
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
module.exports = {
  module: {
    rules: [{
      test: /\.css$/,
      loader: 'postcss-loader',
      options: { plugins: [postcssFlagsPlugin()] }
    }]
  },
  plugins: [
    new VueFlagsPlugin({
      flags: './allFlags.js',
      namespace: 'FLAGS',
      watch: process.env.NODE_ENV === 'development',
      ignoreFiles: {
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
  <!-- will be transformed as
  <div>
    <p>feature a will be enabled</p>
  </div>
   -->
</template>

<script>
  import moduleB from './b-related-module';
  export default {
    data() {
      return {
        // "FLAGS" as namespace
        msg: FLAGS.FLAG_B ? 'feature b content' : '...';
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
  @supports (--flag: FLAG_A) {
    p { color: red; }
  }
  @supports not ((--flag: FLAG_A) or (--flag: FLAG_B)) {
    p { font-size: 12px; }
  }
  /**
    You must use "--flag" as custom property name
    see @supports: https://developer.mozilla.org/en-US/docs/Web/CSS/@supports
    above will be transformed as:
    p { color: yellow; }
    p { color: red; }
  */
</style>
```

### ⚠️ attention
* `v-*-flag` can not be used with `v-if` followed by `v-else-if` or `v-else`.

  💡use `<template v-*-flag>` to wrap the condition elements.
* `v-else-flag` and `v-elif-flag` can not be used with `slot-scope` or `v-slot`.

  💡only use `v-if-flag` on scoped slot element and put all slots in the end.

### License
MIT
