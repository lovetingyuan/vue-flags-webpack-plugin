process.env.NODE_ENV = 'TEST'
const runTest = require('./transform-node')
const loadCompiler = require('./utils/loadCompiler')
const getTemplates = require('./utils/loadTemplates')
const path = require('path')

const versions = [
  '2.5.12',
  '2.5.17',
  '2.6.0',
  '2.6.10',
  'latest'
]

const tpls = [
  // 'basic',
  // 'nest',
  // 'condition',
  // 'for',
  // 'slot',
  // 'slot-scope',
  // 'error-next',
  // 'error-missing',
  // 'error-condition',
  // 'error-slot'
]

Promise.all(versions.map(v => loadCompiler(v))).then(compilers => {
  const templates = getTemplates(path.join(__dirname, 'transform-node'))
  compilers.forEach((compiler, i) => {
    if (!tpls.length) {
      tpls.push(...Object.keys(templates))
    }
    tpls.forEach(name => runTest(compiler, versions[i], templates[name]))
  })
}).catch(err => {
  console.error('transform-node.test error: ', err)
  process.exit(-1)
})
