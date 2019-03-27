const { runTest, loadCompiler } = require('./transform-node')
const versions = [
  '2.5.12',
  '2.6.0',
  '2.6.10',
]
const templates = [
  'basic',
  'nest',
  'condition',
  'slot',
]
Promise.all(versions.map(v => loadCompiler(v))).then(compilers => {
  compilers.forEach((compiler, i) => {
    templates.forEach(t => runTest(compiler, versions[i], t))
  })
})
