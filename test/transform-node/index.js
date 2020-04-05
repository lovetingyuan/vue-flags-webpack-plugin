const path = require('path')
const fse = require('fs-extra')
const Terser = require('terser')
const got = require('got')
const { PLUGIN_NAME } = require('../../lib/constants')
const onEnd = require('util').promisify(require('end-of-stream'))
const test = require('tape')
const chalk = require('chalk')

const {
  preTransformNode,
  // postTransformNode,
  staticKeys
} = require('../../lib/transform-node')

const loadTemplates = (filenames) => {
  if (!filenames || !filenames.length) {
    filenames = fse.readdirSync(__dirname).filter(v => v.endsWith('.vue')).map(v => v.split('.')[0])
  }
  return filenames.reduce((mp, file) => {
    mp[file] = fse.readFileSync(path.join(__dirname, file + '.vue'), 'utf8')
    return mp
  }, {})
}

const belongsTo = (a, b) => {
  for (const k of Object.keys(a)) {
    if (!(k in b)) return false
    if (a[k] !== b[k]) return false
  }
  return true
}

const loadCompiler = async (version = 'latest') => {
  const url = `https://unpkg.com/vue-template-compiler@${version}/build.js`
  const cachePath = path.resolve(__dirname, `../node_modules/.cache/${PLUGIN_NAME}/tests/vue-template-compiler-${version}.js`)
  if (fse.pathExistsSync(cachePath)) {
    try {
      const compiler = require(cachePath)
      if (typeof compiler.parseComponent === 'function') {
        compiler.__version = version
        return compiler
      }
    } catch (e) { }
  }
  await fse.ensureFile(cachePath)
  await onEnd(got.stream(url).pipe(fse.createWriteStream(cachePath)))
  const compiler = require(cachePath)
  compiler.__version = version
  return compiler
}

function generateFlags (html, len) {
  const flags = new Set()
  html.replace(/@([a-z0-9_ ]+?)#/mg, (a, str) => {
    str.trim().split('_').forEach(v => flags.add(v[0]))
  })
  const names = [...flags]
  const num = names.length
  const list = Array.from(Array(2 ** num)).map(() => {
    return Array.from(Array(num)).reduce((a, _, b) => {
      a[names[b]] = Math.random() > 0.5
      return a
    }, {})
  })
  if (typeof len === 'number') {
    list.length = len
  }
  return list
}

function runEach (compiler, template, attrs, flags, t) {
  const { render, staticRenderFns, errors } = compiler.compile(template, {
    outputSourceRange: true,
    modules: [{
      staticKeys,
      preTransformNode (ast, options) {
        return preTransformNode(ast, options, { flags: { ...flags } })
      }
    }]
  })
  if (errors.length) {
    if (attrs.error) {
      t.ok(errors[0].msg.includes(attrs.error), 'expected error: ' + attrs.error)
    } else {
      t.fail(errors[0].msg)
    }
    return
  }
  const { error, code } = Terser.minify(render + ';' + staticRenderFns, {
    parse: {
      bare_returns: true
    }
  })
  t.error(error, 'should not error with terser.')
  const compiledMark = {}
  code.replace(/@([a-z0-9_ ]+?)#/mg, (s, bg) => {
    bg.trim().split('_').forEach(item => {
      const name = item[0]
      const bool = item[1] !== '0'
      if (!(name in compiledMark)) {
        compiledMark[name] = bool
      } else {
        t.equal(compiledMark[name], bool, 'should not conflict.')
      }
    })
  })
  t.ok(
    belongsTo(compiledMark, flags),
    `flags: ${JSON.stringify(flags)}, computed: ${JSON.stringify(compiledMark)}`
  )
}

module.exports = function startTest () {
  Promise.all([
    '2.5.0',
    '2.5.22',
    '2.6.11',
    'latest'
  ].map(loadCompiler)).then(compilers => {
    compilers.forEach(compiler => {
      Object.entries(loadTemplates()).forEach(([name, file]) => {
        const { template: { content: template, attrs } } = compiler.parseComponent(file)
        test(chalk.cyan(`template: ${name}, compiler: ${compiler.__version}`), t => {
          generateFlags(template).forEach(flags => {
            runEach(compiler, template, attrs, flags, t)
          })
          t.end()
        })
      })
    })
  }).then(() => {
    console.log('All cases passed!')
  }).catch(err => {
    console.error('Test failed:')
    console.error(err)
    process.exit(-1)
  })
}
