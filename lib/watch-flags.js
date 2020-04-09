const Watchpack = require('watchpack')
const clearModule = require('clear-module')
const fs = require('fs')
const { PLUGIN_NAME } = require('./constants')

function codegen () {
  /* eslint-disable */
  "use strict";
  var flags = Object.freeze(FLAGS_OBJECT_VALUE);
  module.exports = (typeof window === 'object' && window.document) ? (
    typeof Proxy === 'function' ? new Proxy(flags, {
      get(target, name) {
        if (name in target) {
          return target[name];
        }
        if (name === Symbol.toPrimitive) {
          return () => JSON.stringify(target);
        }
        if (name === 'toJSON') {
          return target;
        }
        throw new Error('PLUGIN_NAME: Unknown flag name, "' + name + '" is not defined.');
      },
    }) : flags) : flags;
}

/* eslint-enable */
codegen.toCode = function toCode (flags) {
  const funcStr = Function.prototype.toString.call(this)
  const bodyStr = funcStr.substring(funcStr.indexOf('{') + 1, funcStr.lastIndexOf('}'))
  return bodyStr.replace('FLAGS_OBJECT_VALUE', JSON.stringify(flags, null, 2))
    .replace('PLUGIN_NAME', PLUGIN_NAME).trim()
}

function updateGetFlags (flagsPath, cachedFlagsPath, errors = 0) {
  clearModule(flagsPath)
  clearModule(cachedFlagsPath)
  let newFlags
  try {
    newFlags = require(flagsPath)
    JSON.stringify(newFlags)
  } catch (err) {
    // errors is used for different editor file-writting mechanism
    if (errors > 10) { throw err }
    return updateGetFlags(flagsPath, cachedFlagsPath, errors + 1)
  }
  fs.writeFileSync(cachedFlagsPath, codegen.toCode(newFlags))
  return newFlags
}

module.exports = function startWatch (watchPaths, pluginOptions, watchOptions) {
  const allWatch = [
    ...watchPaths.files,
    ...watchPaths.dirs
  ]
  const flagsPath = allWatch[0] // flags file path from user option
  updateGetFlags(flagsPath, pluginOptions.cachedFlagsPath)
  const watcher = new Watchpack(Object.assign({}, watchOptions))
  watcher.watch([...watchPaths.files], [...watchPaths.dirs], Date.now())
  let delay // some file systems will trigger "change" event many times
  watcher.on('change', () => {
    clearTimeout(delay)
    delay = setTimeout(() => {
      allWatch.forEach(f => clearModule(f))
      pluginOptions.flags = updateGetFlags(flagsPath, pluginOptions.cachedFlagsPath)
    }, 338) // 🙂
  })
  pluginOptions.stopWatch = () => watcher.close()
  Array('SIGINT', 'SIGTERM', 'SIGHUP').forEach(sig => { // eslint-disable-line
    process.on(sig, () => watcher.close())
  })
}
