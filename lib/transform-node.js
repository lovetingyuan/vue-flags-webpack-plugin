const { toFunc } = require('./utils')
const {
  PLUGIN_NAME,
  IF_FLAG, ELIF_FLAG, ELSE_FLAG,
  ELE_NODE, TXT_NODE,
  VUE_IF_DIR, VUE_ELSE_DIR, VUE_ELSE_IF_DIR,
  VUE_PRE_DIR
} = require('./constants')

const dirReplaceMap = {
  [IF_FLAG]: VUE_IF_DIR,
  [ELIF_FLAG]: VUE_ELSE_IF_DIR,
  [ELSE_FLAG]: VUE_ELSE_DIR
}

const forbiddenDirs = [VUE_IF_DIR, VUE_ELSE_IF_DIR, VUE_ELSE_DIR, VUE_PRE_DIR]
const flagDirs = [IF_FLAG, ELIF_FLAG, ELSE_FLAG]

const flagMeta = 'staticFlagMeta'

function hasAttribute (node, name) {
  return !!(
    (name in node.attrsMap) ||
    (node.rawAttrsMap && (name in node.rawAttrsMap)) ||
    node.attrsList.find(attr => attr.name === name)
  )
}

function findLastNode (node) {
  const children = node.parent.children
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i]
    if (!(child.type === TXT_NODE && (!child.text.trim() || child.isComment))) {
      if (child.ifConditions) {
        return child.ifConditions[child.ifConditions.length - 1].block
      }
      return child
    }
  }
}

function serializeNode (node) {
  node = Array.isArray(node) ? node[0] : node
  if (!node) return ''
  if (node.type === ELE_NODE) {
    if (node[flagMeta]) {
      var { name, value, index } = node[flagMeta]
    }
    const attrs = Object.keys(node.attrsMap).map((attr, i) => {
      let flag = ''
      if (i === index) {
        flag = `${name}=${JSON.stringify(value)} `
      }
      return flag + `${attr}=${JSON.stringify(node.attrsMap[attr])}`
    })
    if (attrs.length === index) {
      attrs.push(`${name}=${JSON.stringify(value)}`)
    }
    return `<${node.tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`
  } else {
    return node.isComment ? `<!--${node.text}-->` : node.text
  }
}

const [
  HASERROR, HASFLAG
] = [
  Symbol('has-error'),
  Symbol('has-flag')
]

function onError (options, msg, node) {
  const chalk = require('chalk')
  msg = chalk.red(`${PLUGIN_NAME}: `) + `${msg} at ${serializeNode(node)}${serializeNode(node.children)}...`
  // options.warn only works in development mode
  if (options.warn.length === 2) {
    options.warn({
      msg,
      start: node.start,
      end: node.end
    }, false) // false means error type not warning
  } else {
    // add in 2.6.0, node is range actually, should set `outputSourceRange` to true
    options.warn(msg, node, false)
  }
  options[HASERROR] = true
}

function preTransformNode (ast, options, { flags }) {
  if (options[HASERROR]) return
  if (!ast.parent) {
    options[HASFLAG] = false
    options[HASERROR] = false
  }
  const result = []
  flagDirs.forEach(dir => {
    if (dir in ast.attrsMap) {
      result.push([dir, ast.attrsMap[dir].trim()])
    }
  })
  if (!result.length) return ast
  if (result.length > 1) {
    return onError(options, `${result.map(v => v[0])} can not be used together`, ast)
  }
  const [[dir, value]] = result
  if (!ast.parent) {
    return onError(options, `${dir} can not be used on root element(consider "ignoreFiles" option)`, ast)
  }
  if (dir === IF_FLAG || dir === ELIF_FLAG) {
    if (value === '') {
      return onError(options, `${dir} can not be empty`, ast)
    }
  } else if (value !== '') {
    return onError(options, `${dir} must be empty`, ast)
  }
  if (forbiddenDirs.some(dir => hasAttribute(ast, dir))) {
    return onError(options, `v-*-flag can not be used with ${forbiddenDirs}`, ast)
  }
  // there is no need to check v-pre at parent node.

  try {
    ast.attrsMap[dirReplaceMap[dir]] = value ? !!toFunc(`(${value})`).call(flags) + '' : 'true'
  } catch (err) {
    return onError(options, `Unknown flag at: ${dir}=${JSON.stringify(value)}, ${err.message}`, ast)
  }
  delete ast.attrsMap[dir]
  for (let i = 0; i < ast.attrsList.length; i++) {
    const attr = ast.attrsList[i]
    if (attr.name === dir) {
      ast.attrsList.splice(i, 1)
      i--
    }
  }

  if (dir === IF_FLAG) {
    ast[flagMeta] = true
  } else {
    const prevNode = findLastNode(ast)
    if (!prevNode || !prevNode[flagMeta]) {
      return onError(options, `${dir} must be next to ${IF_FLAG} or ${ELIF_FLAG}`, ast)
    }
    ast[flagMeta] = true
  }
  options[HASFLAG] = true
  return ast
}

module.exports = {
  staticKeys: [flagMeta],
  preTransformNode
}
