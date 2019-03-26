const template = `
  <div>
    <h1>basic</h1>
    <!--<div v-if="a">
      <h1 v-if-flag="sdf">ghjkll;jh</h1>
      <h2 v-elif-flag="bb">bbbbbbbbb</h2>
      <hr>
      <h3 v-if-flag="cc">cccccc</h3>
      <h4 v-else-flag>dddd</h4>
      <img>
    </div>
    <div v-else-if="b">
      <span></span>
      <h5 v-if-flag="ddddd">ddddddddddd</h5>
      <dd></dd>
      <h6 v-if-flag="eeeee">eeeeeee</h6>
      <p v-elif-flag="dsfsdfsd"></p>
      <span v-else-flag>ghkj</span>
    </div>
    <div v-else>
      <ul v-if-flag="sdhhjjk">
        <li v-if-flag="thiskd"></li>
        <li v-else-flag>jhdfsk</li>
      </ul>
    </div>-->
    <div>
      <span slot="afsdf">dfsfd</span>
      <span slot="dfg" slot-scope="sfsf">9089j</span>
    </div>
  </div>
`
const loadCompiler = require('./transform-node/compiler')
const { _preTransformNode } = require('../lib/transform-node')
loadCompiler('2.6.10').then(({ compile }) => {
  return compile(template, {
    outputSourceRange: true,
    modules: [{
      preTransformNode(ast, options) {
        // return _preTransformNode(ast, options)
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
  if (ret.errors) {
    throw new Error(ret.errors)
  }
}).catch(err => {
  console.error(err)
})
