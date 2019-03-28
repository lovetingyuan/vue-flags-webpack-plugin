const webpackTest = require('./webpack-build')
const test = require('tape')

;[
  {
    flags: { a: true, b: false },
    callback (result, t) {
      t.ok(/(template|script|style):a{5,}/.test(result))
      t.notOk(/(template|script|style):b{5,}/.test(result))
      t.ok(/(add){6,}/.test(result))
    }
  },
  {
    flags: { a: false, b: false },
    callback (result, t) {
      t.notOk(/(template|script|style):a{5,}/.test(result))
      t.notOk(/(template|script|style):b{5,}/.test(result))
      t.notOk(/(add){6,}/.test(result))
    }
  }
].forEach(({ flags, callback }) => {
  test('webpack-test: ' + JSON.stringify(flags), t => {
    webpackTest(flags)
      .then(result => {
        callback(result, t)
        setTimeout(() => t.end())
      })
      .catch(err => t.fail(err))
  })
})
