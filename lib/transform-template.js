const chalk = require('chalk');
const htmlparser2 = require('htmlparser2');
const domutils = require('domutils');

const { IF_FLAG, ELIF_FLAG, ELSE_FLAG } = require('./constants');
const testDirective = new RegExp(`\\s${IF_FLAG}\\s*=\\s*"[^"]*?"[\\s|>]`);
const toXml = require('./html-to-xml');

function getError(msg, node) {
  return new Error(
    `💥 ${chalk.bold.red('Vue template flag loader error')} 👇\n` +
    `${chalk.red(msg)} at template:\n` +
    `${chalk.yellow(domutils.getOuterHTML(node))}`
  );
}

// 0: blank text, 1: other, 2: if-flag, 3: elif-flag, 4: else-flag
function getState(node) {
  if (node.type === 'text' && !node.data.trim()) {
    return 0;
  }
  if (node.type !== 'tag' && node.type !== 'style') { // not support 'script'
    return 1;
  }
  if (IF_FLAG in node.attribs) {
    if (!node.attribs[IF_FLAG]) {
      throw getError(`Directive "${IF_FLAG}" can not be empty`, node);
    }
    return 2;
  }
  if (ELIF_FLAG in node.attribs) {
    if (!node.attribs[ELIF_FLAG]) {
      throw getError(`Directive "${ELIF_FLAG}" can not be empty`, node);
    }
    return 3;
  }
  if (ELSE_FLAG in node.attribs) {
    if (node.attribs[ELSE_FLAG]) {
      throw getError(`Directive "${ELSE_FLAG}" must be empty`, node);
    }
    return 4;
  }
  return 1;
}

function setFlagValue(node, attr, values, truthy, flags) {
  try {
    const exp = (values || []).map(v => `!(${v})&&`).join('') + `(${truthy})`;
    const keepElement = (new Function(`with(this){return ${exp}}`)).call(flags);
    node.__value = [attr, !!keepElement];
  } catch(e) {
    throw getError(`Unknown flag name, ${e.message}`, node);
  }
}

function getDirectives(dom, flags) {
  let values = null, prevState = 1;
  for (let node of dom) {
    if (node.children) {
      getDirectives(node.children, flags);
    }
    const currentState = getState(node);
    switch (currentState) {
      case 1: {
        values = null;
        break;
      }
      case 2: {
        const value = node.attribs[IF_FLAG];
        setFlagValue(node, IF_FLAG, null, value, flags);
        values = [value];
        break;
      }
      case 3: {
        if (prevState !== 2 && prevState !== 3) {
          throw getError(`Directive "${ELIF_FLAG}" must be next to "${IF_FLAG}"`, node);
        }
        const value = node.attribs[ELIF_FLAG];
        setFlagValue(node, ELIF_FLAG, [...values], value, flags);
        values.push(value);
        break;
      }
      case 4: {
        if (prevState !== 2 && prevState !== 3) {
          throw getError(`Directive "${ELSE_FLAG}" must be next to "${IF_FLAG}"`, node);
        }
        setFlagValue(node, ELSE_FLAG, [...values], 'true', flags);
        values = null;
        break;
      }
      default: break;
    }
    if (currentState !== 0) {
      prevState = currentState;
    }
  }
}

function transformDom(dom, flags) {
  getDirectives(dom, flags);
  for (let node of dom) {
    if (node.__value) {
      const [attr, keepElement] = node.__value;
      if (!keepElement) {
        domutils.removeElement(node);
      } else {
        delete node.attribs[attr];
        if (node.children) {
          transformDom(node.children, flags);
        }
      }
    } else {
      if (node.children) {
        transformDom(node.children, flags);
      }
    }
  }
}

module.exports = function transformTemplate(template, flags, loaderContext) {
  if (!testDirective.test(template)) {
    return template;
  }
  const dom = htmlparser2.parseDOM(
    toXml(template.trim()),
    {
      decodeEntities: false,
      xmlMode: true,
      recognizeSelfClosing: true
    }
  );
  if (dom.length !== 1 || dom[0].type !== 'tag') {
    return template;
  }
  try {
    transformDom(dom, flags);
  } catch(e) {
    loaderContext.emitError(e);
    return template;
  }
  return domutils.getOuterHTML(dom);
}
