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
    ? (Number(flag) + '' === flag ? genFlags(['a', 'b', 'c', 'd', 'e', 'f'], Math.pow(2, +flag)) : genFlags(flag))
    : genFlags(['a', 'b', 'c', 'd', 'e', 'f'], typeof flag === 'boolean' ? 1 : 16)
  test(chalk.cyan(`${title}@${version}`), t => {
    flagsList.forEach(flags => {
      const { render, staticRenderFns, errors, tips } = compile(html, {
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
      if (error || tip) {
        if (error) {
          t.ok(
            errors.some((err) => {
              const msg = typeof err === 'string' ? err : err.msg
              return msg.indexOf(error) > 0
            }),
            'errors match expect: ' + error
          )
        }
        if (tip) {
          t.ok(
            tips.some((err) => {
              const msg = typeof err === 'string' ? err : err.msg
              return msg.indexOf(tip) > 0
            }),
            'tips match expect: ' + tip
          )
        }
      }
      if (!error) {
        t.notOk(
          errors.length || /("|')(v-)?(if|else|elif)-flag/.test(result),
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
  const version = '2.6.10'
  loadCompiler(version).then(compiler => {
    const result = compiler.compile(`
    <section>
    <!-- test cases with v-if -->
    <h1>this is title</h1>
    <div v-if="foo">
      <div v-if-flag="a && b"> __a1_b1-- </div>
      <br>
      <a-compoent />
      <span v-if-flag="b"> __b1-- </span><!-- comment -->

      <span v-elif-flag="c && !d"> __b0_c1_d0--</span>
    </div>
    <div v-else-if="bar">
      <img src="" alt="">
      <div v-if-flag="c"> __c1-- </div>
      <span v-else-flag>__c0--</span>
    </div>

    <div v-else>
      <ul v-if-flag="f"> __f1--
        <li v-if="foo" v-if-flag="d">__f1_d1--</li>
        <li v-if="bar" v-elif-flag="e">__f1_d0_e1--</li>
        <li v-else-flag title="__f1_d0_e0--"></li>
      </ul>
      <template v-else-flag>__f0--</template>
      <div v-if="boo">
        <section v-if="foo"></section>
        <section v-else-if="bar" v-if-flag="e">__e1--</section>
        <section v-else-flag>__e0--</section>
      </div>
      <div v-else v-if-flag="d">
        <section v-if="far">__d1--</section>
        <section v-else-if="bar" v-if-flag="a">__d1_a1--</section>
        <section v-else v-else-flag>__d1_a0--</section>
      </div>
      <div v-else-flag> __d0--
        <div v-if-flag="a">__d0_a1--</div>
        <section v-if="far" v-elif-flag="b">__d0_a0_b1--</section>
        <section v-elif-flag="f">__d0_a0_b0_f1--</section>
        <section v-if="boo" v-else-flag>__d0_a0_b0_f0--</section>
      </div>
    </div>
  </section>
    `, {
      outputSourceRange: true,
      modules: [{
        // staticKeys,
        preTransformNode,
        postTransformNode (ast, option) {
          if (!ast.parent) {
            debugger
          }
          postTransformNode(ast, option, { flags: { a: false } })
        }
      }]
    })
    debugger
  })
}
