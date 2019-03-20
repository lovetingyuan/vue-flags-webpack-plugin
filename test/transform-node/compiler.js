const findCacheDir = require('find-cache-dir')
const fse = require('fs-extra')
const got = require('got')
const { PLUGIN_NAME } = require('../../lib/constants')
const onEnd = require('util').promisify(require('end-of-stream'))

// https://api.github.com/repos/vuejs/vue/contents/packages/vue-template-compiler/build.js
module.exports = async function loadCompiler (version) {
  const url = 'https://raw.githubusercontent.com/vuejs/vue/v' + version + '/packages/vue-template-compiler/build.js'
  const createCachePath = findCacheDir({ name: PLUGIN_NAME, thunk: true })
  const cachePath = createCachePath('tests', 'vue-template-compiler-v' + version + '.js')
  if (fse.pathExistsSync(cachePath)) {
    return require(cachePath)
  }
  await fse.ensureFile(cachePath)
  await onEnd(got.stream(url).pipe(fse.createWriteStream(cachePath)))
  return require(cachePath)
}
