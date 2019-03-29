const { loadCompiler } = require('./transform-node')
const {
  preTransformNode,
  // postTransformNode,
  staticKeys
} = require('../lib/transform-node')
loadCompiler('2.6.10').then(({ compile }) => {
  return compile(template, {
    outputSourceRange: true,
    whitespace: 'condense',
    modules: [{
      staticKeys,
      preTransformNode(ast, options) {
        return preTransformNode(ast, options)
      },
      postTransformNode(ast, options) {
        if (!ast.parent) {
          console.log(ast)
        }
      }
    }]
  })
}).then((ret) => {
  console.log(ret)
  if (ret.errors && ret.errors.length) {
    throw new Error(ret.errors)
  }
}).catch(err => {
  console.error(err)
})

var template = `
<div>
  <div v-if="foo"></div>
  <div v-else-if="foo"></div>
  <div v-else></div>
</div>
`
