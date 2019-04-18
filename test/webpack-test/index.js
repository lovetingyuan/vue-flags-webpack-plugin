const webpack = require('webpack')
const path = require('path')
const VueLoaderPlugin = require('vue-loader/lib/plugin')
const MemoryFileSystem = require('memory-fs')
const events = require('events')
const Fs = require('fs')
const FlagPlugin = require('../..')

const webpackConfig = (flags, dev, useVue) => ({
  context: __dirname,
  entry: useVue ? './main.js' : './main-no-vue.js',
  mode: dev ? 'development' : 'production',
  devtool: false,
  module: {
    rules: [
      useVue ? {
        test: /\.vue$/,
        loader: 'vue-loader'
      } : null,
      {
        test: /\.css$/,
        loader: 'postcss-loader',
        options: {
          plugins: [FlagPlugin.postcssFlagsPlugin()]
        }
      }
    ].filter(Boolean)
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: dev ? 'development' : 'production'
      }
    }),
    new FlagPlugin({
      flags: dev ? './flags-test.js' : flags,
      namespace: 'VueFlags',
      ignoreFiles: {
        a: /add\.js$/
      },
      watch: !!dev
    }),
    useVue ? new VueLoaderPlugin() : null
  ].filter(Boolean)
})

function build (flags, useVue) {
  return new Promise((resolve, reject) => {
    const compiler = webpack(webpackConfig(flags, false, useVue))
    const fs = compiler.outputFileSystem = new MemoryFileSystem()
    compiler.hooks.failed.tap(FlagPlugin.name, err => reject(err))
    compiler.run((err, stats) => {
      if (err || stats.hasErrors()) {
        reject(err || stats.compilation.errors)
      } else {
        resolve(fs.readFileSync(path.join(compiler.outputPath, 'main.js'), 'utf8'))
      }
    })
  })
}

function dev (flags) {
  const eventEmitter = new events.EventEmitter()
  const writeFlags = flags => {
    Fs.writeFileSync(path.join(__dirname, 'flags-test.js'), 'module.exports=' + JSON.stringify(flags))
  }
  writeFlags(flags)
  const compiler = webpack(webpackConfig(flags, true, true))
  const { pluginOptions } = compiler.options.plugins.find(p => p instanceof FlagPlugin)
  const fs = compiler.outputFileSystem = new MemoryFileSystem()
  compiler.hooks.done.tap(FlagPlugin.name, stats => {
    eventEmitter.emit('done', fs.readFileSync(path.join(compiler.outputPath, 'main.js'), 'utf8'))
  })
  compiler.hooks.failed.tap(FlagPlugin.name, err => {
    eventEmitter.emit('error', err)
  })
  const watcher = compiler.watch({
    aggregateTimeout: 1000
  }, (err, stats) => {
    if (err) {
      eventEmitter.emit('error', err)
    }
  })
  eventEmitter.on('close', (callback) => {
    pluginOptions.watcher.close()
    process.nextTick(() => watcher.close(callback))
  })
  eventEmitter.on('update', writeFlags)
  return eventEmitter
}

module.exports = {
  build,
  dev
}
