process.env.NODE_ENV = 'TEST'
const postcss = require('postcss')
const postcssPlugin = require('../lib/postcss-flags-plugin')
const test = require('tape')
const chalk = require('chalk')
const path = require('path')

const loadCompiler = require('./utils/loadCompiler')
const getTemplates = require('./utils/templates')

test(chalk.cyan('postcss-plugin:exp'), t => {
  const main = params => {
    return postcssPlugin.transformExpression(
      { params },
      { warn (err) { throw new Error(err) } }
    ).replace(/ /g, '')
  }
  t.equal(main('not (--flag: foo) and (--flag: bar)'), '!(foo)&&(bar)')
  t.equal(main('not (--flag: foo )and   ( --flag:bar )'), '!(foo)&&(bar)')
  t.equal(main('not(--flag:bar)and(--flag:foo)'), '!(bar)&&(foo)')
  t.equal(main('(--flag : foo) and (not(--flag: bar) or (--flag: far))'), '(foo)&&(!(bar)||(far))')
  t.equal(main('(--flag : foo) and((--flag: bar) or ( not(--flag: far)))'), '(foo)&&((bar)||(!(far)))')
  t.throws(() => {
    main('not(--flag: foo) and (display: hello)')
  }, / "@supports" can not be used with other properties/)
  t.throws(() => {
    main('(--flag: foo) and not(--flag: )')
  }, / value of "--flag" is missing /)
  t.end()
})

loadCompiler().then(({ parseComponent }) => {
  const templates = getTemplates(path.join(__dirname, 'postcss-plugin'))
  Object.keys(templates).forEach(name => {
    const { styles } = parseComponent(templates[name])
    let source
    const cases = styles.filter(s => {
      if (s.attrs.flag) return true
      source = s
    })
    test(chalk.cyan('postcss-plugin:' + name), t => {
      Promise.all(cases.map((style) => {
        delete postcssPlugin.pluginOptions
        return postcss([postcssPlugin(eval(`({${style.attrs.flag}})`))]) // eslint-disable-line
          .process(source.content, { from: void 0 })
          .then(ret => {
            t.equal(ret.css, style.content)
          })
      })).then(() => t.end()).catch(err => t.fail(err))
    })
  })
})
