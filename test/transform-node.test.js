const runTest = require('./transform-node')
const versions = [
  // '2.5.12',
  // '2.6.0',
  '2.6.10',
]
const templates = [
  'basic',
  // 'nest',
]
templates.forEach(t => {
  versions.forEach(v => runTest(v, t))
})
