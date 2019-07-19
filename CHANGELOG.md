## vue-flags-webpack-plugin changelog
### v1.1.0
+ update dependencies
+ drop support for node < 8.9.0


### v1.0.0 🎉
+ add `watch` option to support modify flags in development
+ `flags` could also be a file path
+ plugin could also be used in non-vue project
+ support to use js expression as key in `ignoreFiles`
+ postcss plugin supports nest `@supports` rules
+ better log output both in development and production
+ use `compilerOptions.modules` instead of `htmlparser` to process template
+ use loader instead of plugin to filter files(modules)
+ option `namespace` is required now
+ option `files` is renamed `ignoreFiles`
+ performance improvement
+ do not support `webpack < 4`, `vue < 2.5.12`, `vue-loader < 15` anymore
+ add lots of UT cases

### v0.2.0
* update vue `htmlparser`
* fix: `module.rule` traverse
* fix: missing sourceMap for template loader

### v0.1.2
* remove `htmlparser2` and use vue official `htmlparser`

### v0.1.1
* add some test cases and fix bug for CI

### v0.1.0
* initial
