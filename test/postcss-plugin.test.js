const postcss = require('postcss')
const postcssPlugin = require('../lib/postcss-flags-plugin')

const test = require('tape')
const main = function (source, t) {
  return postcss([postcssPlugin({
    a: true,
    b: false
  })])
    .process(source, { from: void 0 })
    .then(ret => ret.css)
    .catch(e => t.fail(e.message))
}

test('postcss', function (t) {
  t.plan(1)
  main(`
    @supports (--flag: a) {
      h1:before {
        content: 'aaa';
      }
    }
    div {font-size: 12px;}
    @supports (--flag: b) {
      h1:before {
        content: 'bbb';
      }
    }
    @supports not (--flag: b) {
      h1:before {
        content: 'not bb';
      }
    }
    @supports not (--flag: b) and (--flag: a) {
      h2:before {
        content: 'aa and bb';
      }
    }
  `, t).then(css => {
    t.equal(css.replace(/\s{2,}/g, ''), `
      h1:before {
        content: 'aaa';
      }
      div {font-size: 12px;}
      h1:before {
        content: 'not bb';
      }
      h2:before {
        content: 'aa and bb';
      }
    `.replace(/\s{2,}/g, ''))
  })
})
