## vue-flags-webpack-plugin changelog
### v1.0.0
* features
  + add `watch` option to support modify flags in development
  + `flags` could also be a file or directory path
  + plugin could be used in non-vue project
  + support to use js expression as key in `files`
  + report missing flags both in development and production
* improvement
  + remove vue `htmlparser` and use `compilerOptions.modules` to transform flag directives
  + use loader instead of plugin to ignore files(modules)
  + `namespace` is required now
  + fix bugs and better error tips and performance improvement

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
