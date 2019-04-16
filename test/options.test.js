const test = require('tape')
const chalk = require('chalk')
process.env.NODE_ENV = 'TEST'
const { setOptions, validateOptions } = require('../lib/resolve-options')

test(chalk.cyan('options test:valid'), t => {
  [
    {
      namespace: 'N',
      flags: { a: true }
    },
    {
      namespace: 'N',
      flags: {}
    },
    {
      namespace: 'N',
      flags: { foo: true },
      files: { foo: /a/ }
    },
    {
      namespace: 'N',
      flags: {},
      watch: false
    }
  ].forEach(option => {
    t.equal(validateOptions(option), option)
    t.equal(setOptions(option, './', {}, true).namespace, option.namespace)
  })
  t.end()
})

test(chalk.cyan('options test:invalid'), t => {
  t.throws(() => validateOptions({
    flags: { a: true },
    namespace: 'F',
    watch: true
  }), /flags should be string/)
  t.throws(() => validateOptions({
    flags: { a: true, b: 0 },
    namespace: 'F'
  }), /b should be boolean/)

  ;[{
    flags: { a: true },
    namespace: 'parseInt',
    msg: /not a valid or available variable/
  }, {
    flags: { a: true },
    namespace: ' ',
    msg: /not a valid or available variable/
  }, {
    flags: './flags.js',
    namespace: 'F',
    watch: true,
    msg: /sure only use "watch" in development mode/
  }, {
    flags: { a: true },
    namespace: 'D',
    files: { a: /s/, '#fb': /ss/ },
    msg: /Invalid flag value/
  }].forEach(option => {
    const msg = option.msg
    delete option.msg
    t.doesNotThrow(() => validateOptions(option))
    t.throws(() => setOptions(option, './', {}, false), msg)
  })
  t.end()
})
