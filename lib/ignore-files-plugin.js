// see https://webpack.js.org/plugins/ignore-plugin/

const slash = require('slash');
const {
  NodeJsInputFileSystem,
  CachedInputFileSystem,
  ResolverFactory
} = require('enhanced-resolve');
const {PLUGIN_NAME} = require('./constants');

module.exports = class IgnorePlugin {
  constructor(regs) {
    this.regs = regs;
    this.checkIgnore = this._checkIgnore.bind(this);
    this.asyncCheckIgnore = this._asyncCheckIgnore.bind(this);
  }
  _getResolver(resolveOptions) {
    const syncResolver = ResolverFactory.createResolver(Object.assign({
      fileSystem: new CachedInputFileSystem(new NodeJsInputFileSystem(), 4000),
      useSyncFileSystemCalls: true,
    }, resolveOptions));
    return function ({contextInfo, context, request}) {
      request = request.replace(/^-?!+/, '')
        .replace(/!!+/g, '!')
        .replace(/!$/, '').split('!').pop();
      try {
        return syncResolver.resolveSync(contextInfo, context, request);
      } catch(e) {
        return null;
      }
    };
  }
  _asyncCheckIgnore(result, callback) {
    if (!this._checkIgnore(result)) {
      return callback();
    }
    return callback(null, result);
  }
  _checkIgnore(result) {
    let resourcePath = this._resolve(result);
    if (!resourcePath) {
      return result;
    }
    resourcePath = slash(resourcePath);
    if (this.regs.some(v => v.test(resourcePath))) {
      return null;
    }
    return result;
  }
  apply(compiler) {
    if (!this.regs.length) return;
    this._resolve = this._getResolver(compiler.options.resolve || {});
    if (compiler.hooks) {
      compiler.hooks.normalModuleFactory.tap(PLUGIN_NAME, nmf => {
        nmf.hooks.beforeResolve.tap(PLUGIN_NAME, this.checkIgnore);
      });
      compiler.hooks.contextModuleFactory.tap(PLUGIN_NAME, cmf => {
        cmf.hooks.beforeResolve.tap(PLUGIN_NAME, this.checkIgnore);
      });
    } else { // for webpack < 4
      compiler.plugin('normal-module-factory', nmf => {
        nmf.plugin('before-resolve', this.asyncCheckIgnore);
      });
      compiler.plugin('context-module-factory', cmf => {
        cmf.plugin('before-resolve', this.asyncCheckIgnore);
      });
    }
  }
}
