const {
  preTransformNode,
  postTransformNode,
  staticKeys
} = require('../lib/transform-node')

const templates = require('./transform-node/templates')
const loadCompiler = require('./transform-node/compiler')
const namespace = 'VueFlags'
const test = require('tape')
const vm = require('vm')

const version = '2.6.0'

loadCompiler(version).then(({ parseComponent, compile }) => {
  const {
    template: { content: html },
    script: { content: code, attrs: { title } }
  } = parseComponent(templates.basic)
  const cases = vm.runInNewContext(code)
  cases.forEach(({ flags, includes, excludes, name }, index) => {
    test(`${version}: ${title}-${name || index}`, t => {
      const { render, staticRenderFns, errors } = compile(html, {
        outputSourceRange: true,
        modules: [{
          staticKeys,
          preTransformNode,
          postTransformNode (ast, option) {
            postTransformNode(ast, option, { flags, namespace })
          }
        }]
      })
      t.notOk(errors.length)
      const result = String(render + staticRenderFns)
      t.ok(includes.every(text => result.indexOf(`__${text}--`) > 0), includes)
      t.ok(excludes.every(text => result.indexOf(`__${text}--`) < 0), excludes)
      t.end()
    })
  })
})
