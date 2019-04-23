const fse = require('fs-extra')
const got = require('got')
const path = require('path')
const { PLUGIN_NAME } = require('../../lib/constants')
const onEnd = require('util').promisify(require('end-of-stream'))

module.exports = async function loadCompiler (version = 'latest') {
  const url = `https://unpkg.com/vue-template-compiler@${version}/build.js`
  const cachePath = path.resolve(__dirname, `../node_modules/.cache/${PLUGIN_NAME}/tests/vue-template-compiler-${version}.js`)
  if (fse.pathExistsSync(cachePath)) {
    try {
      const compiler = require(cachePath)
      if ('parseComponent' in compiler) {
        return compiler
      }
    } catch (e) {}
  }
  await fse.ensureFile(cachePath)
  await onEnd(got.stream(url).pipe(fse.createWriteStream(cachePath)))
  return require(cachePath)
}
