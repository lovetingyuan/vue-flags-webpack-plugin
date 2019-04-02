const chalk = require('chalk')
const { toFunc } = require('./utils')
const {
  PLUGIN_NAME,
  IF_FLAG, ELIF_FLAG, ELSE_FLAG,
  ELE_NODE, EXP_NODE, TXT_NODE,
  VUE_IF_DIR, VUE_ELSE_DIR, VUE_ELSE_IF_DIR,
  VUE_SLOT_DIR, VUE_SLOT_SCOPE
} = require('./constants')

const warnAttrs = [
  VUE_IF_DIR, VUE_ELSE_DIR, VUE_ELSE_IF_DIR,
  VUE_SLOT_DIR, VUE_SLOT_SCOPE
]

const flagMeta = 'staticFlagMeta'
const nodeIndex = 'staticNodeIndex'

function evaluateFlagDir (node, options, flags) {
  const { exps, name, value } = node[flagMeta]
  const len = exps.length - 1
  const expression = exps.map((exp, i) => `${i !== len ? '!' : ''}(${exp || true})`).join('&&')
  try {
    return toFunc(expression).call(flags)
  } catch (err) {
    onError(options, `Unknown flag at: ${name}=${JSON.stringify(value)}, ${err.message}`, node)
    return false
  }
}

function removeFlagDir (node, dir) {
  delete node.attrsMap[dir]
  if (node.rawAttrsMap) {
    delete node.rawAttrsMap[dir]
  }
  const index = node.attrsList.findIndex(({ name }) => name === dir)
  if (index !== -1) {
    node.attrsList.splice(index, 1)
  }
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

const IFPROCESSED = Symbol('if-processed')
const WARN = Symbol('warn')
const HASERROR = Symbol('has-error')
const HASFLAG = Symbol('has-flag')
const NODEINDEX = Symbol('node-index')

function onError (options, msg, node) {
  options[WARN] = options[WARN] || function (msg, node) {
    if (!options.outputSourceRange || !options.warn) {
      msg = `${msg} at ${serializeNode(node)}${serializeNode(node.children)}...`
    }
    if (options.warn) {
      options.warn(msg, options.outputSourceRange ? {
        start: node.start, end: node.end
      } : void 0)
    } else {
      throw new Error(`\n${PLUGIN_NAME} template compiler:\n${chalk.red(msg)}\n`)
    }
  }
  options[WARN](msg, node)
  options[HASERROR] = true
}

function onWarn (msg) {
  console.log()
  console.warn(chalk.yellow(PLUGIN_NAME + ' warning:\n  ') + msg)
  console.log()
}

function transformNode (node, options, flags) {
  if (node.type !== ELE_NODE) return
  let children = []
  if (node.ifConditions) {
    if (node.ifConditions[IFPROCESSED]) {
      children = node.children
    } else {
      node.ifConditions[IFPROCESSED] = true
      const ifNode = node.ifConditions[0].block
      if (ifNode[flagMeta] && node.ifConditions.length > 1) {
        return onError(options, `v-*-flag directive can not be used with ${VUE_IF_DIR}`, ifNode)
      }
      for (let i = 0; i < node.ifConditions.length; i++) {
        const conditionNode = node.ifConditions[i].block
        if (conditionNode[flagMeta]) {
          const keep = evaluateFlagDir(conditionNode, options, flags)
          if (!keep) {
            node.ifConditions.splice(i, 1)
            i--
          } else {
            transformNode(conditionNode, options, flags)
          }
        } else {
          transformNode(conditionNode, options, flags)
        }
      }
      if (!node.ifConditions.length) {
        delete node.ifConditions
        delete node.if
      }
    }
  } else if (node.scopedSlots) {
    Object.keys(node.scopedSlots).forEach(slotName => {
      const slotNode = node.scopedSlots[slotName]
      if (slotNode[flagMeta]) {
        const keep = evaluateFlagDir(slotNode, options, flags)
        if (!keep) {
          delete node.scopedSlots[slotName]
        } else {
          transformNode(slotNode, options, flags)
        }
      } else {
        transformNode(slotNode, options, flags)
      }
    })
    if (!Object.keys(node.scopedSlots).length) {
      delete node.scopedSlots
    }
    if (node.children) {
      children = node.children
    }
  } else if (node.children) {
    children = node.children
  }
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (child[flagMeta]) {
      const keep = evaluateFlagDir(child, options, flags)
      if (!keep) {
        children.splice(i, 1)
        i--
      } else {
        transformNode(child, options, flags)
      }
    } else {
      transformNode(child, options, flags)
    }
  }
}

module.exports = {
  staticKeys: [flagMeta, nodeIndex],
  postTransformNode (ast, options, { flags }) {
    if (!ast.parent && options[HASFLAG] && !options[HASERROR]) {
      transformNode(ast, options, flags)
    }
  },
  preTransformNode (ast, options) {
    if (options[HASERROR]) return
    if (!ast.parent) {
      ast[nodeIndex] = options[NODEINDEX] = 0
      options[HASFLAG] = false
      options[HASERROR] = false
    } else {
      ast[nodeIndex] = ++options[NODEINDEX]
    }
    const { attrsMap, rawAttrsMap } = ast
    const flagDirs = []
    if (IF_FLAG in attrsMap) {
      flagDirs.push([IF_FLAG, attrsMap[IF_FLAG].trim()])
    }
    if (ELIF_FLAG in attrsMap) {
      flagDirs.push([ELIF_FLAG, attrsMap[ELIF_FLAG].trim()])
    }
    if (ELSE_FLAG in attrsMap) {
      flagDirs.push([ELSE_FLAG, attrsMap[ELSE_FLAG].trim()])
    }
    if (!flagDirs.length) return ast
    if (flagDirs.length > 1) {
      return onError(options, `"${flagDirs.map(v => v[0])}" can not be used together`, ast)
    }
    const [[dir, value]] = flagDirs
    if (!ast.parent) {
      return onError(options, `${dir} can not be used on component root element, please consider using "files" option`, ast)
    }
    if (process.env.NODE_ENV !== 'TEST') {
      warnAttrs.some(attr => {
        if (attr in attrsMap || (rawAttrsMap && (attr in rawAttrsMap))) {
          onWarn(`${dir} can not be used with ${attr} at: ${serializeNode(ast)}`)
          return true
        }
      })
    }
    if (dir === IF_FLAG || dir === ELIF_FLAG) {
      if (value === '') {
        return onError(options, `${dir} can not be empty`, ast)
      }
    } else if (value !== '') {
      return onError(options, `${dir} must be empty`, ast)
    }
    removeFlagDir(ast, dir)
    if (dir === IF_FLAG) {
      ast[flagMeta] = {
        exps: [value], name: dir, value
      }
      options[HASFLAG] = true
      return ast
    }
    let prevNode = ast.parent.children.slice(-1)[0]
    if (prevNode.type !== 1) {
      if (prevNode.text.trim() && !prevNode.isComment) {
        return onError(options, `${dir} must be next to ${IF_FLAG} or ${ELIF_FLAG}.`, ast)
      } else {
        prevNode = ast.parent.children.slice(-2)[0]
      }
    }
    if (prevNode.ifConditions) {
      prevNode = prevNode.ifConditions.slice(-1)[0].block
    } else if (prevNode.parent.scopedSlots) {
      const lastSlot = Object.keys(prevNode.parent.scopedSlots).pop()
      if (prevNode.parent.scopedSlots[lastSlot][nodeIndex] > prevNode[nodeIndex]) {
        prevNode = prevNode.parent.scopedSlots[lastSlot]
      }
    }
    if (!(prevNode.type === 1 && prevNode[flagMeta])) {
      onWarn(`Unexpected error in your template at: ${serializeNode(prevNode)}`)
      return ast
    }
    ast[flagMeta] = {
      exps: prevNode[flagMeta].exps.concat(value),
      name: dir,
      value
    }
    options[HASFLAG] = true
    return ast
  }
}
