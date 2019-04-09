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
    template: { content: html, attrs: { title, flag, error = 0, tip = 0 } }
  } = parseComponent(template)
  const allTexts = collectTexts(html)
  const flagsList = typeof flag === 'string'
    ? genFlags(flag)
    : genFlags(['a', 'b', 'c', 'd', 'e', 'f'], typeof flag === 'boolean' ? 1 : 16)
  test(chalk.cyan(`${title}@${version}`), t => {
    flagsList.forEach(flags => {
      const { render, staticRenderFns, errors, tips } = compile(html, {
        outputSourceRange: true,
        modules: [{
          staticKeys,
          preTransformNode,
          postTransformNode (ast, option) {
            if (!ast.parent) {
              'noop' // eslint-disable-line
            }
            postTransformNode(ast, option, { flags: flags._map })
            if (!ast.parent) {
              'noop' // eslint-disable-line
            }
          }
        }]
      })
      const result = render + staticRenderFns
      if (error || tip) {
        if (error) {
          const expextedErrors = eval(`([${error}])`) // eslint-disable-line
          t.ok(
            expextedErrors.length === errors.length && errors.every(({ msg }, i) => {
              return msg.indexOf(expextedErrors[i]) > 0
            }),
            'errors match expect: ' + errors.length
          )
        }
        if (tip) {
          const expextedTips = eval(`([${tip}])`) // eslint-disable-line
          t.ok(
            expextedTips.length === tips.length && tips.every(({ msg }, i) => {
              return msg.indexOf(expextedTips[i]) > 0
            }),
            'tips match expect: ' + tips.length
          )
        }
      } else {
        t.notOk(
          errors.length || tips.length || /v-(if|else|elif)-flag/.test(result),
          'no errors and v-*-flag dirs'
        )
        const retOfCompiler = collectTexts(result)
        const retOfTest = allTexts.filter(text => text.split('_').every(t => flags.includes(t)))
        t.ok(compareArray(retOfCompiler, retOfTest), 'passed for ' + chalk.green(flags))
      }
    })
    t.end()
  })
}

module.exports = runTest

/* eslint-disable */
if (require.main === module) {
  const version = '2.5.12'
  loadCompiler(version).then(compiler => {
    // runTest(compiler, version, `
    // <template title="development" flag error="">
    // <div>
    //   <div v-if-flag="a"></div>{{sdf}} d
    //   <div v-else-flag></div>
    // </div>
    // </template>
    // `)
    const { render, staticRenderFns, errors, tips } = compiler.compile(`
    <div>
      <div v-if="sdfsa" v-if-flag="a" slot="2343" slot-scope="xsddf"></div>
      <span  v-elif-flag="v" slot="aa" slot-scope="dsfsdf"></span>
         <p slot="ggg" v-elif-flag="b">222222</p>
    </div>
    `, {
      outputSourceRange: true,
      modules: [{
        // staticKeys,
        preTransformNode,
        postTransformNode (ast, option) {
          if (!ast.parent) {
            debugger
          }
          // postTransformNode(ast, option, { flags: flags._map })
        }
      }]
    })
  })
}
