const findCacheDir = require('find-cache-dir')
const fse = require('fs-extra')
const got = require('got')
const { PLUGIN_NAME } = require('../../lib/constants')
const onEnd = require('util').promisify(require('end-of-stream'))

module.exports = async function loadCompiler (version = 'latest') {
  const url = `https://unpkg.com/vue-template-compiler@${version}/build.js`
  const createCachePath = findCacheDir({ name: PLUGIN_NAME, thunk: true })
  const cachePath = createCachePath('tests', `vue-template-compiler-${version}.js`)
  if (fse.pathExistsSync(cachePath)) {
    try {
      return require(cachePath)
    } catch (e) {}
  }
  await fse.ensureFile(cachePath)
  await onEnd(got.stream(url).pipe(fse.createWriteStream(cachePath)))
  return require(cachePath)
}
