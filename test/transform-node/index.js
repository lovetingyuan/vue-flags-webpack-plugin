const {
  preTransformNode,
  postTransformNode,
  staticKeys
} = require('../../lib/transform-node')

const loadCompiler = require('../utils/loadCompiler')
const test = require('tape')
const chalk = require('chalk')

function collectTexts (str) {
  const textReg = /__([a-z01_]+?)--/g
  const commentReg = /<!--([\s\S]*?)-->/g
  const ret = new Set()
  str.replace(commentReg, () => '').replace(textReg, (s, t) => ret.add(t))
  return [...ret]
}

function compareArray (a1, a2) {
  if (a1.length !== a2.length) return false
  return a1.every(v => a2.includes(v))
}

function genFlags (seeds, num) {
  if (typeof seeds === 'string') {
    const flags = seeds.split('_')
    const flagMap = {}
    flags._map = flagMap
    flags.forEach(f => { flagMap[f[0]] = f[1] === '1' })
    return [flags]
  }
  const ret = [] // [['a1', 'b0', _map: { a: true, b: false }]]
  for (let i = 0; i < num; i++) {
    const flagMap = {}
    const flags = seeds.map(c => {
      flagMap[c] = Math.random() > 0.5
      return c + (flagMap[c] ? 1 : 0)
    })
    flags._map = flagMap
    ret.push(flags)
  }
  return ret
}

function runTest ({ parseComponent, compile }, version, template) {
  const {
    template: { content: html, attrs: { title, flags } }
  } = parseComponent(template)
  const allTexts = collectTexts(html)
  const num = flags ? 1 : 16
  const flagsList = flags ? genFlags(flags) : genFlags(['a', 'b', 'c', 'd', 'e', 'f'], num)
  test(chalk.cyan(`${title}@${version}`), t => {
    flagsList.forEach(flags => {
      const { render, staticRenderFns, errors } = compile(html, {
        outputSourceRange: true,
        modules: [{
          staticKeys,
          preTransformNode,
          postTransformNode (ast, option) {
            postTransformNode(ast, option, { flags: flags._map })
          }
        }]
      })
      const result = render + staticRenderFns
      t.ok(errors.length === 0 && !/v-(if|else|elif)-flag/.test(result), 'no errors and v-*-flag dirs')
      const retOfCompiler = collectTexts(result)
      const retOfTest = allTexts.filter(text => text.split('_').every(t => flags.includes(t)))
      t.ok(compareArray(retOfCompiler, retOfTest), 'passed for ' + chalk.green(flags))
    })
    t.end()
  })
}

module.exports = runTest

if (require.main === module) {
  const version = '2.6.10'
  loadCompiler(version).then(compiler => {
    runTest(compiler, version, `
    <div>
      <img>
      <div v-if="foo" slot="aaaa" slot-scope="foo">_aaa1--</div>
      <div v-else-if="foo" slot="bbbb" slot-scope="bar" v-if-flag="a">__a1-- {{bar}}</div>
      <div v-else slot="ccccc" slot-scope="far" v-elif-flag="c" :title="far">__a0_c1--</div>
      <p slot="ddddd" slot-scope="boo" v-else-flag>__a0_c0-- {{boo}}</p>
      <span></span>
    </div>
    `)
  })
}
