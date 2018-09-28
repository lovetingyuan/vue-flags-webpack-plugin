const fs = require('fs')
const path = require('path')
const join = path.join.bind(path, __dirname)
const spawn = require('cross-spawn')
const test = require('tape')

const readFile = f => fs.readFileSync(join('vue-cli/dist', f), 'utf8')

test('integration-vue-cli', function (t) {
  const result = spawn.sync('npm', ['run', 'build'], {
    stdio: 'ignore',
    cwd: join('vue-cli')
  })
  const css = readFile('css/app.css')
  const js = readFile('js/app.js')

  t.equal(result.error, null)
  t.equal(result.status, 0)
  t.equal(css.indexOf('featureB is enabled'), -1)
  t.equal(css.indexOf('featureA: enabled, featureB: disabled') > 1, true)
  t.equal(js.indexOf('HelloWorld, featureA is enabled') > 1, true)
  t.equal(js.indexOf('For guide and recipes,'), -1)
  t.equal(js.indexOf('Feature a is enabled, this is true') > 1, true)
  t.equal(js.indexOf('vue-cli documentation'), -1)

  t.end()
})
