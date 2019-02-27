const chalk = require('chalk')
const { toFunc } = require('./utils')
const {
  PLUGIN_NAME,
  IF_FLAG, ELIF_FLAG, ELSE_FLAG,
  ELE_NODE, EXP_NODE, TXT_NODE
} = require('./constants')

const [INITSTATUS, AFTERIF, AFTERELSEIF, AFTERELSE] = [0, 1, 2, 3]
const STATUSMAP = {
  [IF_FLAG]: AFTERIF,
  [ELIF_FLAG]: AFTERELSEIF,
  [ELSE_FLAG]: AFTERELSE
}

function evaluateFlagDir (exps, flags) {
  const l = exps.length - 1
  const expression = exps.map((exp, i) => `${i !== l ? '!' : ''}(${exp})`).join('&&')
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
  const nodeStr = serializeNode(node)
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

function serializeNode (node) {
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
  if (ast.type !== ELE_NODE || !ast.children) return
  const warn = getWarnFunction(options)
  let currentStatus = INITSTATUS
  const exps = []
  const refErrors = {}
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
    let keep = false
    try {
      keep = evaluateFlagDir(exps, flags)
    } catch (err) {
      const { message } = err
      const msg = `Unknown flag${value ? ': ' + JSON.stringify(value) : ''}, ${message}`
      if (err instanceof ReferenceError) {
        if (!refErrors[message]) {
          warn(msg, child)
        }
        refErrors[message] = true
      } else {
        warn(msg, child)
      }
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
const warnSymbol = Symbol('warn')

function getWarnFunction (options) {
  if (!options[warnSymbol]) {
    options[warnSymbol] = (msg, ast) => {
      if (!options.outputSourceRange || !options.warn) {
        msg = `${msg} at ${serializeNode(ast)}${serializeNode(ast.children)}...`
      }
      if (options.warn) {
        options.outputSourceRange ? options.warn(msg, ast) : options.warn(msg)
      } else {
        throw new Error(`\n${PLUGIN_NAME} template compiler:\n${chalk.red(msg)}\n`)
      }
    }
  }
  return options[warnSymbol]
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
    const [[dir, value]] = checkDir
    if (dir === IF_FLAG || dir === ELIF_FLAG) {
      if (value === '') {
        warn(`${dir} can not be empty`, ast)
      }
    } else if (value !== '') {
      warn(`${dir} must be empty`, ast)
    }
    removeFlagDir(ast, dir)
    flagDirNodeMap.set(ast, checkDir[0])
  }
}

module.exports = {
  postTransformNode,
  preTransformNode
}
