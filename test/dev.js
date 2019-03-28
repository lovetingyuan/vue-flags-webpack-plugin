const template = `
  <div>
  <hello>
  <template slot="foo" v-if-flag="e">
    <span v-if-flag="a">__e1_a1--</span>
    <span v-elif-flag="b">__e1_a0_b1--</span>
    <span v-else-flag>__e1_a0_b0--</span>
  </template>
  <template slot="bar" slot-scope="props" v-if-flag="b"> {{props}}
    <span v-if-flag="d">__b1_d1--</span>
    <span v-else-flag>__b1_d0--</span>
  </template>
  <span v-else-flag slot="foot" slot-scope="dfs">
    <span v-if-flag="a">__b0_a1--</span>
    <span v-else-flag>__b0_a0--</span>
  </span>
</hello>
  </div>
`
const { loadCompiler } = require('./transform-node')
const {
  preTransformNode,
  // postTransformNode,
  staticKeys
} = require('../lib/transform-node')
loadCompiler('2.5.17').then(({ compile }) => {
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
