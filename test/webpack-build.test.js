const webpackTest = require('./webpack-test')
const test = require('tape')

test('webpack-template', t => {
  const wt = webpackTest.bind(null, t, ['a', 'b', 'c', 'd', 'e', 'f'])
  const marks = {}
  const cases = ['_a1___', '_a1_b1___', '_a1_b0___', '_a1_c1___', '_a1_c0_d1___', '_a1_c0_d0_e1___', '_a0_f1___', '_a0_f0___']
  cases.forEach(v => {
    marks[v] = false
  })
  const ret = (...rets) => {
    const strs = Object.assign({}, marks)
    rets.forEach(i => { strs[cases[i]] = true })
    return strs
  }
  Promise.all([
    wt('a', 'd', ret(0, 2, 4)),
    wt('a', 'e', ret(0, 2, 5)),
    wt('f', ret(6)),
    wt('a', 'c', 'e', ret(0, 2, 3)),
    wt('a', 'b', 'c', ret(0, 1, 3)),
    wt('a', ret(0, 2))
  ]).then(() => t.end()).catch(e => t.fail(e))
})
