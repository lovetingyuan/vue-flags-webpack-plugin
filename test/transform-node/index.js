const {
  preTransformNode,
  postTransformNode,
  staticKeys
} = require('../../lib/transform-node')

const templates = require('./templates')
const loadCompiler = require('./compiler')
const test = require('tape')
const vm = require('vm')
const chalk = require('chalk')

function collectTexts (str) {
  const textReg = /__([a-z01_]+?)--/g
  const ret = new Set()
  str.replace(textReg, (s, t) => ret.add(t))
  return [...ret]
}

function getFlags (flagStr) {
  const flags = {}
  flagStr.split('_').forEach(v => {
    flags[v[0]] = v[1] === '1'
  })
  return flags
}

function compareArray (a1, a2) {
  if (a1.length !== a2.length) return false
  return a1.every(v => a2.includes(v))
}

module.exports = async function runTest (version, templateName) {
  const { parseComponent, compile } = await loadCompiler(version)
  const {
    template: { content: html },
    script: { content: code, attrs: { title } }
  } = parseComponent(templates[templateName])
  const cases = vm.runInNewContext(code)
  test(chalk.cyan(`${templateName}/${title}@${version}`), t => {
    Object.keys(cases).forEach(flagStr => {
      const { render, staticRenderFns, errors } = compile(html, {
        outputSourceRange: true,
        modules: [{
          staticKeys,
          preTransformNode,
          postTransformNode (ast, option) {
            postTransformNode(ast, option, { flags: getFlags(flagStr) })
          }
        }]
      })
      const result = render + staticRenderFns
      t.ok(errors.length === 0 && !/v-(if|else|elif)-flag/.test(result), 'no errors and v-*-flag dirs')
      const retOfCompiler = collectTexts(result)
      const retOfTest = cases[flagStr].split(',').map(v => v.trim())
      t.ok(compareArray(retOfCompiler, retOfTest), 'passed for ' + chalk.green(flagStr))
    })
    t.end()
  })
}
