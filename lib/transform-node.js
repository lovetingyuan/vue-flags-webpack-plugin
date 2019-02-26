const chalk = require('chalk')
const { toFunc } = require('./utils')
const { PLUGIN_NAME, IF_FLAG, ELSE_FLAG, ELIF_FLAG } = require('./constants')
const [INITSTATUS, AFTERIF, AFTERELSEIF, AFTERELSE] = [0, 1, 2, 3]
const STATUSMAP = {
  [IF_FLAG]: AFTERIF,
  [ELIF_FLAG]: AFTERELSEIF,
  [ELSE_FLAG]: AFTERELSE
}
const [ELE_NODE, EXP_NODE, TXT_NODE] = [1, 2, 3]

function evaluateFlagDir (exps, flags) {
  const l = exps.length - 1
  const expression = exps.map((exp, i) => `${i !== l ? '!' : ''}(${exp})`).join('&&')
  console.log(expression)
  return toFunc(expression).call(flags)
}

function checkFlagDir (node) {
  if (node.type !== ELE_NODE) return false
  return [IF_FLAG, ELIF_FLAG, ELSE_FLAG].map(dir => {
    if (dir in node.attrsMap) {
      return [dir, node.attrsMap[dir].trim()]
    }
  }).filter(Boolean)
}

function removeFlagDir (node, dir) {
  delete node.attrsMap[dir]
  const index = node.attrsList.findIndex(({ name }) => name === dir)
  if (index !== -1) {
    node.attrsList.splice(index, 1)
  }
}

function replaceWithComment (node, dir, value) {
  const nodeStr = getNodeStr(node)
  Object.keys(node).forEach(k => delete node[k])
  Object.assign(node, {
    type: TXT_NODE,
    text: `${nodeStr} was removed due to ${dir}=${JSON.stringify(value)}`,
    isComment: true
  })
}

function removeNode (node) {
  const parent = node.parent
  const childIndex = parent.children.indexOf(node)
  parent.children.splice(childIndex, 1)
  Object.keys(node).forEach(k => delete node[k])
}

function getNodeStr (node) {
  if (Array.isArray(node)) {
    node = node[0]
  }
  if (!node) return ''
  if (node.type === ELE_NODE) {
    const attrs = Object.keys(node.attrsMap).map(k => {
      return `${k}=${JSON.stringify(node.attrsMap[k])}`
    }).join(' ')
    return `<${node.tag}${attrs ? ' ' + attrs : ''}>`
  }
  if (node.type === EXP_NODE || node.type === TXT_NODE) {
    return node.isComment ? `<!--${node.text}-->` : node.text
  }
  return ''
}

function transformNode (ast, options, flags, useComment) {
  if (!ast.children) return
  const warn = getWarnFunction(options)
  let currentStatus = INITSTATUS
  const exps = []
  // ast is dynamic
  for (let i = 0; i < ast.children.length; i++) {
    const child = ast.children[i]
    if (child.type !== ELE_NODE) {
      // only blank node or comment could exist between flag directive nodes
      if (!(child.type === TXT_NODE && (!child.text.trim() || child.isComment))) {
        currentStatus = INITSTATUS
      }
      continue
    }
    if (!flagDirNodeMap.has(child)) {
      currentStatus = INITSTATUS
      transformNode(child, options, flags, useComment)
      continue
    }
    const [dir, value] = flagDirNodeMap.get(child)
    flagDirNodeMap.delete(child)
    if (dir === ELIF_FLAG || dir === ELSE_FLAG) {
      if (currentStatus !== AFTERIF && currentStatus !== AFTERELSEIF) {
        warn(`${dir} must be next to ${IF_FLAG} or ${ELIF_FLAG}`, child)
      }
    } else { // all checking passed
      exps.length = 0 // clear expressions when the directive is v-if-flag
    }
    currentStatus = STATUSMAP[dir]
    exps.push(value || true)
    try {
      var keep = evaluateFlagDir(exps, flags)
    } catch (err) {
      warn(`Unknown flag name: ${JSON.stringify(value)}, ${err.message}`, child)
    }
    if (keep) {
      transformNode(child, options, flags, useComment)
    } else {
      if (useComment) {
        replaceWithComment(child, dir, value)
      } else {
        removeNode(child)
        i = i - 1
      }
    }
  }
}

const flagDirNodeMap = new WeakMap()

function getWarnFunction (options) {
  if (!options._warn) {
    const warn = options.warn || (msg => { throw new Error(msg) })
    options._warn = (msg, ast) => {
      if (warn.length === 3) { // v2.6.0 supports code range
        return warn(msg, ast)
      } else {
        const template = getNodeStr(ast) + getNodeStr(ast.children)
        msg = `${PLUGIN_NAME} template compiler:\n${chalk.red(`${msg} at ${template}...`)}`
        return warn(msg)
      }
    }
  }
  return options._warn
}

function postTransformNode (ast, options, pluginOptions, useComment) {
  if (!ast.parent) {
    transformNode(ast, options, pluginOptions.flags, useComment)
  }
}

function preTransformNode (ast, options) {
  const warn = getWarnFunction(options)
  const checkDir = checkFlagDir(ast)
  if (checkDir && checkDir.length) {
    if (!ast.parent) {
      warn(`"${checkDir.map(v => v[0])}" can not be used on root element`, ast)
    }
    if (checkDir.length > 1) {
      warn(`"${checkDir.map(v => v[0])}" can not be used together`, ast)
    }
    const [dir, value] = checkDir[0]
    if (dir === IF_FLAG || dir === ELIF_FLAG) {
      if (value === '') {
        warn(`${dir} can not be empty`, ast)
      }
    } else {
      if (value !== '') {
        warn(`${dir} must be empty`, ast)
      }
    }
    removeFlagDir(ast, dir)
    flagDirNodeMap.set(ast, checkDir[0])
  }
}

module.exports = {
  postTransformNode,
  preTransformNode
}
