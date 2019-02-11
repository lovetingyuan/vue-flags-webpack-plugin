## vue-flags-webpack-plugin changelog
### v1.0.0
* add `watch` option to support modify flags in development
* remove vue `htmlparser` and use `compilerOptions.modules` to transform flag directives
* `flags` could also be a file or directory path
* use loader instead of plugin to ignore files(modules)
* `namespace` is required now
* plugin could be used without vue(but with warning)
* support use js expression as key in `files`
* fix bugs and improve performance

### v0.1.2
* remove `htmlparser2` and use vue official `htmlparser`

### v0.1.1
* add some test cases and fix bug for CI

### v0.1.0
* initial
