const test = require('tape')
const transform = require('../lib/transform-template')
const main = function (template, t) {
  return transform(template, {
    a: true,
    b: false
  }, {
    emitError (e) {
      t.fail(e.message)
    }
  })
}

test('transform-template:if-else', function (t) {
  const transformedTemplate = main(`
    <div>
    <div v-if-flag="a">aaaa</div>
    <div v-else-flag>bbbb</div>
    <img src="111">
    <img src="222"/>
    <my-comp title="ttt" />
    <span>text</span>
    </div>
  `, t)
  t.equal(transformedTemplate.replace(/\s{2,}/g, ''), `<div>
  <div>aaaa</div>
  <img src="111">
    <img src="222">
    <my-comp title="ttt"></my-comp>
    <span>text</span>
  </div>`.replace(/\s{2,}/g, ''))
  t.end()
})

test('transform-template:if-elif-else', function (t) {
  const transformedTemplate = main(`
    <div>
    <div v-if-flag="b">bbbb</div>
    <div v-elif-flag="a">aaaa</div>
    <div v-else-flag>other</div>
    </div>
  `, t)
  t.equal(transformedTemplate.replace(/\s{2,}/g, ''), `<div>
  <div>aaaa</div>
  </div>`.replace(/\s{2,}/g, ''))
  t.end()
})

test('transform-template:nest-if-else', function (t) {
  const transformedTemplate = main(`
    <div>
    <div v-if-flag="a">
      <p v-if-flag="a">aaa</p>
      <p v-else-flag>not aaa</p>
    </div>
    <div v-else-flag>other</div>
    </div>
  `, t)
  t.equal(transformedTemplate.replace(/\s{2,}/g, ''), `<div>
  <div>
   <p>aaa</p>
  </div>
  </div>`.replace(/\s{2,}/g, ''))
  t.end()
})
