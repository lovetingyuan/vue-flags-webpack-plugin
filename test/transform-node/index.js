const {
  _preTransformNode,
  _postTransformNode,
  staticKeys
} = require('../../lib/transform-node')

const templates = require('./templates')
const loadCompiler = require('./compiler')
const test = require('tape')
const chalk = require('chalk')

function collectTexts (str) {
  const textReg = /__([a-z01_]+?)--/g
  const ret = new Set()
  str.replace(textReg, (s, t) => ret.add(t))
  return [...ret]
}

function compareArray (a1, a2) {
  if (a1.length !== a2.length) return false
  return a1.every(v => a2.includes(v))
}

function genFlags (seeds, num = 15) {
  const ret = []
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

exports.runTest = function runTest ({ parseComponent, compile }, version, templateName) {
  const {
    template: { content: html, attrs: { title } }
  } = parseComponent(templates[templateName])
  const allTexts = collectTexts(html)
  const flagsList = genFlags(['a', 'b', 'c', 'd', 'e', 'f'])
  test(chalk.cyan(`${templateName}/${title}@${version}`), t => {
    flagsList.forEach(flags => {
      const { render, staticRenderFns, errors } = compile(html, {
        outputSourceRange: true,
        modules: [{
          staticKeys,
          preTransformNode (ast, options) {
            return _preTransformNode(ast, options)
          },
          postTransformNode (ast, option) {
            _postTransformNode(ast, option, flags._map)
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

exports.loadCompiler = loadCompiler
