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

const [ flagMeta, nodeIndex ] = [ 'staticFlagMeta', 'staticNodeIndex' ]

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
const HASERROR = Symbol('has-error')
const HASFLAG = Symbol('has-flag')
const NODEINDEX = Symbol('node-index')

function onError (options, msg, node, tip) {
  const chalk = require('chalk')
  msg = chalk[tip ? 'bgYellow' : 'bgRed'].black('', `${PLUGIN_NAME}:`, '') + ' ' + msg
  if (options.warn.length === 2) { // (msg: string, tip?: boolean)
    msg = `${msg} at ${serializeNode(node)}${serializeNode(node.children)}...`
    options.warn(msg, tip)
  } else { // add in 2.6, (msg: string, range?: { start: number, end?: number }, tip?: boolean)
    options.warn(msg, {
      start: node.start, end: node.end
    }, tip)
  }
  if (!options[HASERROR]) {
    options[HASERROR] = !tip
  }
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

function preTransformNode (ast, options) {
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
  if (dir === IF_FLAG || dir === ELIF_FLAG) {
    if (value === '') {
      return onError(options, `${dir} can not be empty`, ast)
    }
  } else if (value !== '') {
    return onError(options, `${dir} must be empty`, ast)
  }
  if (process.env.NODE_ENV !== 'TEST') {
    warnAttrs.some(attr => {
      if (attr in attrsMap || (rawAttrsMap && (attr in rawAttrsMap))) {
        onError(options, `${dir} can not be used with ${attr}`, ast, true)
        return true
      }
    })
  }
  removeFlagDir(ast, dir)
  if (dir === IF_FLAG) {
    ast[flagMeta] = {
      exps: [value], name: dir, value
    }
    options[HASFLAG] = true
    return ast
  }
  const children = ast.parent.children.slice()
  let len = children.length
  let prevNode
  while (len--) {
    const child = children[len]
    if (child.type === ELE_NODE) {
      prevNode = child
      if (child[flagMeta]) {
        prevNode = child
        break
      }
    } else if (child.text.trim() && !child.isComment) {
      return onError(options, `${dir} must be next to ${IF_FLAG} or ${ELIF_FLAG}`, ast)
    }
  }
  // let lastSlotScopeNode = null
  // if (ast.parent.scopedSlots) {
  //   Object.keys(ast.parent.scopedSlots).forEach(name => {
  //     const slotNode = ast.parent.scopedSlots[name]
  //     if (!lastSlotScopeNode || slotNode[nodeIndex] > lastSlotScopeNode[nodeIndex]) {
  //       lastSlotScopeNode = slotNode
  //     }
  //   })
  // }
  // if (lastSlotScopeNode && children.includes(lastSlotScopeNode)) {
  //   lastSlotScopeNode = null
  // }
  // let prevNode = children[children.length - 1]
  // if (!prevNode) {
  //   prevNode = lastSlotScopeNode
  // } else if (prevNode.type !== ELE_NODE) {
  //   prevNode = children[children.length - 2]
  //   if (!prevNode) {
  //     prevNode = lastSlotScopeNode
  //   }
  // }

  // if (lastSlotScopeNode && lastSlotScopeNode[flagMeta] && !children.includes(lastSlotScopeNode)) {
  //   let i = 0
  //   for (; i < children.length; i++) {
  //     const child = children[i]
  //     if (child.type === ELE_NODE && child[nodeIndex]) {

  //     }
  //   }
  // }
  // let prevNode = ast.parent.children.slice(-1)[0]
  // if (prevNode) {
  //   if (prevNode.type !== ELE_NODE) {
  //     if (!prevNode.text.trim() || prevNode.isComment) {
  //       prevNode = ast.parent.children.slice(-2)[0]
  //       if (!prevNode || prevNode.type !== ELE_NODE) {
  //         return onError(options, `${dir} must be next to ${IF_FLAG} or ${ELIF_FLAG}`, ast)
  //       }
  //     } else {
  //       return onError(options, `${dir} must be next to ${IF_FLAG} or ${ELIF_FLAG}`, ast)
  //     }
  //   }
  // } else {
  //   return onError(options, `${dir} must be next to ${IF_FLAG} or ${ELIF_FLAG}`, ast)
  // }

  // if (!prevNode || prevNode.type !== ELE_NODE) {
  //   return onError(options, `${dir} must be next to ${IF_FLAG} or ${ELIF_FLAG}`, ast)
  // }
  if (prevNode.ifConditions) {
    prevNode = prevNode.ifConditions.slice(-1)[0].block
  }
  // else if (prevNode.parent.scopedSlots) {
  //   const scopedSlots = prevNode.parent.scopedSlots
  //   for (let slotName in scopedSlots) {
  //     if (scopedSlots.hasOwnProperty(slotName)) {
  //       if (scopedSlots[slotName][nodeIndex] === options[NODEINDEX] - 1) {

  //       }
  //     }
  //   }
  //   const lastSlot = Object.keys(prevNode.parent.scopedSlots).pop()
  //   if (prevNode.parent.scopedSlots[lastSlot][nodeIndex] > prevNode[nodeIndex]) {
  //     prevNode = prevNode.parent.scopedSlots[lastSlot]
  //   }
  // }
  ast[flagMeta] = {
    exps: prevNode[flagMeta].exps.concat(value),
    name: dir,
    value
  }
  options[HASFLAG] = true
  return ast
}

module.exports = {
  staticKeys: [flagMeta, nodeIndex],
  preTransformNode,
  postTransformNode (ast, options, { flags }) {
    if (!ast.parent && options[HASFLAG] && !options[HASERROR]) {
      transformNode(ast, options, flags)
    }
  }
}
