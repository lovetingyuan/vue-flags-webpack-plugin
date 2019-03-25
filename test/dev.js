const template = `
  <div>
    <h1>basic</h1>
    <div v-if-flag="a"> __a1-- </div>
    <hello-world></hello-world>
    <ul>
      <li v-if-flag="b">__b1--</li>
      <li v-else-flag>__b0--</li>
    </ul>
    <template></template>
    <span v-if-flag="c">__c1--</span>
    <span v-elif-flag="a">__c0_a1--
      <a v-if-flag="aaaa"></a>
      <a v-elif-flag="bbb"></a>
      <slot></slot>
      <b v-if-flag="cccc"></b>
      <b v-else-flag></b>
      <i v-if-flag="cccc"></i>
      <i v-elif-flag="cccc"></i>
    </span>
    <span v-elif-flag="b">__c0_a0_b1--</span>
    <span v-else-flag>__c0_a0_b0--</span>
  </div>
`
const loadCompiler = require('./transform-node/compiler')
loadCompiler('2.6.10').then(({ compile }) => {
  return compile(template, {
    outputSourceRange: true,
    modules: [{
      pre
    }]
  })
}).then((ret) => {
  console.log(ret)
  if (ret.errors) {
    throw new Error(ret.errors)
  }
}).catch(err => console.error(err))
