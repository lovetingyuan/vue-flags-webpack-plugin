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
      ignoreFiles: { foo: /a/ }
    },
    {
      namespace: 'N',
      flags: { foo: true },
      ignoreFiles: { foo: [/a/] }
    },
    {
      namespace: 'N',
      flags: { foo: true },
      ignoreFiles: { foo: [] }
    },
    {
      namespace: 'N',
      flags: {},
      watch: false
    },
    {
      namespace: 'N',
      flags: './flags.js',
      watch: true
    },
    {
      namespace: 'N',
      flags: './flags.js'
    },
    {
      namespace: 'N',
      flags: './flags.js',
      watch: []
    },
    {
      namespace: 'N',
      flags: './flags.js',
      watch: ['./foo.js']
    }
  ].forEach(option => {
    t.doesNotThrow(() => {
      validateOptions(option)
      const po = setOptions(option, __dirname, {}, true)
      t.equal(po.namespace, option.namespace)
      t.equal(!!option.watch, !!po.stopWatch)
      po.stopWatch && po.stopWatch()
    })
  })
  t.end()
})

test(chalk.cyan('options test:invalid'), t => {
  ;[{ err: /"namespace" must be stri/ }, {
    flags: { a: true },
    namespace: 'F',
    watch: true,
    err: /"flags" must be a file path when "watch" i/
  }, {
    flags: { a: true },
    namespace: ' F',
    err: /is not a valid or available variable name/
  }, {
    flags: [],
    namespace: 'F',
    err: /"flags" must be plain object or file path/
  }, {
    flags: {},
    namespace: 'F',
    ignoreFiles: [],
    err: /"ignoreFiles" must be object/
  }, {
    flags: {},
    namespace: 'F',
    ignoreFiles: { k: '' },
    err: /"ignoreFiles" must use regular expression/
  }, {
    flags: './test/flags.js',
    namespace: 'df',
    watch: [],
    err: /Make sure only use "watch" in development mode/
  }].forEach(option => {
    const err = option.err
    delete option.err
    t.throws(() => {
      validateOptions(option)
      setOptions(option, './', {}, false)
    }, err)
  })
  t.end()
})
