const { runTest, runTests, loadCompiler } = require('./transform-node')
const testNum = 1
const versions = [
  // '2.5.12',
  // '2.5.17',
  // '2.6.0',
  '2.6.10'
]
const templates = [
  // 'basic',
  // 'nest',
  // 'condition',
  // 'slot'
  'dev'
]
const latestVersion = require('latest-version')
latestVersion('vue-template-compiler').then(latest => {
  if (!versions.includes(latest)) {
    versions.push(latest)
  }
  return Promise.all(versions.map(v => loadCompiler(v)))
}).then(compilers => {
  compilers.forEach((compiler, i) => {
    if (!templates.length) {
      runTests(compiler, versions[i])
    } else {
      templates.forEach(tpl => runTest(compiler, versions[i], tpl, testNum))
    }
  })
}).catch(err => {
  console.error('transform-node.test error: ', err)
  process.exit(-1)
})
