const { build, dev } = require('./webpack-test')
const test = require('tape')
const chalk = require('chalk')
const clearModule = require('clear-module')

const has = (flag, result, watch, useVue = true) => {
  return new RegExp(`(${useVue ? 'template|' : ''}${watch ? '' : 'script|'}style):${flag}{5,}`).test(result)
}

const buildCases = [
  {
    flags: { a: true, b: false },
    useVue: true,
    callback (ret, t) {
      t.ok(has('a', ret))
      t.notOk(has('noa', ret))
      t.notOk(has('b', ret))
      t.ok(has('nob', ret))
      t.ok(/(add){6,}/.test(ret))
    }
  },
  {
    flags: { a: false, b: true },
    useVue: true,
    callback (ret, t) {
      t.notOk(has('a', ret))
      t.ok(has('b', ret))
      t.ok(has('noa', ret))
      t.notOk(has('nob', ret))
      t.notOk(/(add){6,}/.test(ret))
    }
  },
  {
    flags: { a: false, b: false },
    useVue: true,
    callback (ret, t) {
      t.notOk(has('a', ret))
      t.ok(has('noa', ret))
      t.notOk(has('b', ret))
      t.ok(has('nob', ret))
      t.notOk(/(add){6,}/.test(ret))
    }
  },
  {
    flags: { a: false, b: true },
    useVue: false,
    callback (ret, t) {
      t.notOk(has('a', ret, false, true))
      t.ok(has('noa', ret, false, true))
      t.ok(has('b', ret, false, true))
      t.notOk(has('nob', ret, false, true))
      t.notOk(/(add){6,}/.test(ret))
    }
  },
  {
    flags: { a: true, b: false },
    useVue: false,
    callback (ret, t) {
      t.ok(has('a', ret, false, true))
      t.notOk(has('noa', ret, false, true))
      t.notOk(has('b', ret, false, true))
      t.ok(has('nob', ret, false, true))
      t.ok(/(add){6,}/.test(ret))
    }
  }
]

test(chalk.cyan('webpack-test:build'), t => {
  buildCases.reduce((c1, c2) => {
    return Promise.resolve(c1).then(c => build(c.flags, c.useVue).then(ret => c.callback(ret, t) || c2))
  }).then(() => t.end()).catch(err => t.fail(err))
})

const { RESOLVED_FLAGS_PATH } = require('../lib/constants')
const watchCases = [
  {
    flags: { a: true, b: false },
    callback (ret, t) {
      t.equal(JSON.stringify(require(RESOLVED_FLAGS_PATH)), JSON.stringify(this.flags))
      t.ok(has('a', ret, true))
      t.notOk(has('b', ret, true))
      t.notOk(has('noa', ret, true))
      t.ok(has('nob', ret, true))
      t.ok(/script:a{6,}/.test(ret)) // because watch mode uses ProvidePlugin
      t.ok(/(add){6,}/.test(ret))
    }
  },
  {
    flags: { a: false, b: true },
    callback (ret, t) {
      clearModule(RESOLVED_FLAGS_PATH)
      t.equal(JSON.stringify(require(RESOLVED_FLAGS_PATH)), JSON.stringify(this.flags))
      t.notOk(has('a', ret, true))
      t.notOk(has('nob', ret, true))
      t.ok(has('noa', ret, true))
      t.ok(has('b', ret, true))
      t.ok(/script:a{6,}/.test(ret)) // because watch mode uses ProvidePlugin
      t.notOk(/(add){6,}/.test(ret))
    }
  },
  {
    flags: { a: false, b: false },
    callback (ret, t) {
      clearModule(RESOLVED_FLAGS_PATH)
      t.equal(JSON.stringify(require(RESOLVED_FLAGS_PATH)), JSON.stringify(this.flags))
      t.notOk(has('a', ret, true))
      t.ok(has('noa', ret, true))
      t.ok(has('nob', ret, true))
      t.notOk(has('b', ret, true))
      t.notOk(/(add){6,}/.test(ret))
    }
  },
  {
    flags: { a: true, b: true },
    callback (ret, t) {
      clearModule(RESOLVED_FLAGS_PATH)
      t.equal(JSON.stringify(require(RESOLVED_FLAGS_PATH)), JSON.stringify(this.flags))
      t.ok(has('a', ret, true))
      t.notOk(has('noa', ret, true))
      t.notOk(has('nob', ret, true))
      t.ok(has('b', ret, true))
      t.ok(/(add){6,}/.test(ret))
    }
  }
]

test(chalk.cyan('webpack-test:watch'), t => {
  let index = 0
  const eventEmitter = dev(watchCases[index].flags)
  eventEmitter.on('error', err => t.fail(err))
  eventEmitter.on('done', ret => {
    // tape can not catch error in custom callback
    try {
      watchCases[index].callback(ret, t)
    } catch (err) { t.fail(err) }
    if (!watchCases[++index]) {
      eventEmitter.emit('close', () => t.end())
    } else {
      eventEmitter.emit('update', watchCases[index].flags)
    }
  })
})
