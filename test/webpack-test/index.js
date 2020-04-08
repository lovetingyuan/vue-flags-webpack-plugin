const Module = require('module')
const rfp = Module._resolveFilename
const mmap = [
  'webpack', 'vue-loader', 'vue-loader/lib/plugin', 'vue-template-compiler', 'vue-template-compiler/package.json'
].reduce((k1, k2) => {
  k1[k2] = require.resolve(k2)
  return k1
}, {})

Module._resolveFilename = function _resolveFilename (req, ...args) {
  if (req in mmap) return mmap[req]
  return rfp.call(this, req, ...args)
}

const path = require('path')
const VueLoaderPlugin = require('vue-loader/lib/plugin')
const MemoryFileSystem = require('memory-fs')
const webpack = require(path.resolve(__dirname, '../node_modules/webpack'))
const test = require('tape')

test.onFinish(() => { Module._resolveFilename = rfp })

const runTest = (Case, t) => {
  const FlagPlugin = require('../..')
  const plugin = new FlagPlugin({
    flags: Case.flags,
    namespace: 'VueFlags',
    ignoreFiles: {
      a: /add\.js$/
    }
  })
  const { promise, resolve, reject } = new function () {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }()
  const compiler = webpack({
    context: __dirname,
    entry: './main.js',
    mode: 'production',
    devtool: false,
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: 'vue-loader'
        },
        {
          test: /\.css$/,
          loader: 'postcss-loader',
          options: {
            plugins: [FlagPlugin.postcssFlagsPlugin()]
          }
        }
      ]
    },
    plugins: [
      plugin,
      new VueLoaderPlugin()
    ]
  })
  const fs = compiler.outputFileSystem = new MemoryFileSystem()
  compiler.hooks.failed.tap(FlagPlugin.name, reject)
  compiler.run((err, stats) => {
    const error = err || stats.compilation.errors[0]
    if (error) {
      reject(error)
    } else {
      const result = fs.readFileSync(path.join(compiler.outputPath, 'main.js'), 'utf8')
      t.ok(Case.nothas.every(r => !result.includes(r)))
      if (Case.has) {
        t.ok(Case.has.every(r => result.includes(r)))
      }
      resolve()
    }
  })
  return promise
}

test('webpack', t => {
  const tasks = [{
    flags: { a: true, b: false },
    has: ['template:aaaaa', 'script:aaaaa', 'style:aaaaa', 'template:nobbbbb', 'script:nobbbbb', 'style:nobbbbb'],
    nothas: ['template:noaaaaa', 'script:noaaaaa', 'style:noaaaaa', 'template:bbbbb', 'script:bbbbb', 'style:bbbbb']
  }, {
    flags: { a: false, b: false },
    has: ['template:noaaaaa', 'script:noaaaaa', 'style:noaaaaa', 'template:nobbbbb', 'script:nobbbbb', 'style:nobbbbb'],
    nothas: ['template:aaaaa', 'script:aaaaa', 'style:aaaaa', 'template:bbbbb', 'script:bbbbb', 'style:bbbbb']
  }, {
    flags: { a: false, b: true },
    has: ['template:noaaaaa', 'script:noaaaaa', 'style:noaaaaa', 'template:bbbbb', 'script:bbbbb', 'style:bbbbb'],
    nothas: ['template:aaaaa', 'script:aaaaa', 'style:aaaaa', 'template:nobbbbb', 'script:nobbbbb', 'style:nobbbbb']
  }]
  tasks.reduce((p, task) => {
    return p.then(() => runTest(task, t))
  }, Promise.resolve()).then(() => {
    t.end()
  }).catch(err => {
    t.fail(err && err.message)
  })
})
