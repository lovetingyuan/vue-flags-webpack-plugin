process.env.NODE_ENV = 'TEST'
const runTest = require('./transform-node')
const loadCompiler = require('./utils/loadCompiler')
const getTemplates = require('./utils/loadTemplates')
const path = require('path')

const versions = [
  '2.5.12',
  // '2.5.13',
  // '2.5.14',
  // '2.5.15',
  // '2.5.16',
  '2.5.17',
  // '2.5.18',
  // '2.5.19',
  // '2.5.20',
  // '2.5.21',
  '2.5.22',
  '2.6.0',
  // '2.6.1',
  // '2.6.2',
  // '2.6.3',
  // '2.6.4',
  // '2.6.5',
  // '2.6.6',
  // '2.6.7',
  // '2.6.8',
  // '2.6.9',
  '2.6.10',
  'latest'
]

let tpls = [
  // 'basic',
  // 'nest',
  // 'condition',
  // 'slot',
  // 'slot-scope',
  // 'error-next',
  // 'error-missing',
  // 'error-condition',
  // 'error-slot2',
  'slot-dir'
  // 'any'
]

const testAll =
  true ||
  require('is-ci')

Promise.all(versions.map(v => loadCompiler(v))).then(compilers => {
  const templates = getTemplates(path.join(__dirname, 'transform-node'))
  const tmpls = Object.keys(templates)
  compilers.forEach((compiler, i) => {
    if (testAll) {
      tpls = tmpls
    }
    tpls.forEach(name => runTest(compiler, versions[i], templates[name]))
  })
}).catch(err => {
  console.error('transform-node.test error: ', err)
  process.exit(-1)
})
