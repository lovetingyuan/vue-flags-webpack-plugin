const { toFunc } = require('./utils')
const {
  PLUGIN_NAME,
  IF_FLAG, ELIF_FLAG, ELSE_FLAG,
  ELE_NODE, EXP_NODE, TXT_NODE,
  VUE_IF_DIR, VUE_ELSE_DIR, VUE_ELSE_IF_DIR,
  VUE_SLOT_DIR, VUE_SLOT_SCOPE
} = require('./constants')

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
  if (options.warn.length === 2) {
    msg = `${msg} at ${serializeNode(node)}${serializeNode(node.children)}...`
    options.warn(msg, tip) // (msg: string, tip?: boolean)
  } else {
    // add in vue 2.6, (msg: string, range?: { start: number, end?: number }, tip?: boolean)
    options.warn(msg, { start: node.start, end: node.end }, tip)
  }
  if (!options[HASERROR]) {
    options[HASERROR] = !tip
  }
}

function transformNodes (nodes, options, flags) {
  if (Array.isArray(nodes)) { // node.children or node.ifConditions
    if (nodes[IFPROCESSED]) { // node.ifConditions
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i].block
        if (node[flagMeta]) {
          const keep = evaluateFlagDir(node, options, flags)
          if (!keep) {
            nodes.splice(i, 1)
            i--
          } else {
            processElement(node, options, flags)
          }
        } else {
          processElement(node, options, flags)
        }
      }
    } else { // node.children
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (node.ifConditions || !node[flagMeta]) {
          processElement(node, options, flags)
        } else {
          const keep = evaluateFlagDir(node, options, flags)
          if (!keep) {
            nodes.splice(i, 1)
            i--
          } else {
            processElement(node, options, flags)
          }
        }
      }
    }
  } else { // node.scopedSlots
    Object.keys(nodes).forEach(slotName => {
      const slotNode = nodes[slotName]
      if (slotNode[flagMeta]) {
        const keep = evaluateFlagDir(slotNode, options, flags)
        if (!keep) {
          delete nodes[slotName]
        } else {
          processElement(slotNode, options, flags)
        }
      } else {
        processElement(slotNode, options, flags)
      }
    })
  }
}

function processElement (node, options, flags) {
  if (node.type !== ELE_NODE) return
  if (node.ifConditions) {
    if (node.ifConditions[IFPROCESSED]) {
      transformNodes(node.children, options, flags)
    } else {
      node.ifConditions[IFPROCESSED] = true
      if (node.ifConditions.length > 1 && node[flagMeta]) {
        const conditionDirs = [VUE_IF_DIR, VUE_ELSE_IF_DIR, VUE_ELSE_DIR]
        return onError(options, `${node[flagMeta].name} directives can not be used with ${conditionDirs}`, node)
      }
      transformNodes(node.ifConditions, options, flags)
      if (!node.ifConditions.length) {
        delete node.ifConditions
        delete node.if
      }
    }
  }
  if (node.scopedSlots) {
    transformNodes(node.scopedSlots, options, flags)
    if (!Object.keys(node.scopedSlots).length) {
      delete node.scopedSlots
    }
  }
  if (node.children) {
    transformNodes(node.children, options, flags)
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
    return onError(options, `${dir} can not be used on component root element(consider "files" option)`, ast)
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
  if (
    ast.parent.scopedSlots ||
    VUE_SLOT_DIR in attrsMap || VUE_SLOT_SCOPE in attrsMap ||
    (rawAttrsMap && (VUE_SLOT_DIR in rawAttrsMap || VUE_SLOT_SCOPE in rawAttrsMap))
  ) {
    // because scopedSlots will lose order, it is hard to deal with this situation
    const scopedSlotDirs = [VUE_SLOT_SCOPE, VUE_SLOT_DIR]
    return onError(options, `${dir} can not be used with ${scopedSlotDirs}`, ast)
  }
  const children = ast.parent.children.slice()
  let len = children.length
  let prevNode
  while (len--) {
    const child = children[len]
    if (child.type === ELE_NODE) {
      if (child.ifConditions) {
        prevNode = child.ifConditions[child.ifConditions.length - 1].block
      } else {
        prevNode = child
      }
      break
    }
    if (child.text.trim() && !child.isComment) {
      return onError(options, `${dir} must be next to ${IF_FLAG} or ${ELIF_FLAG}`, ast)
    }
  }
  if (!prevNode || !prevNode[flagMeta]) {
    return onError(options, `${dir} must be next to ${IF_FLAG} or ${ELIF_FLAG}`, ast)
  }
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
      processElement(ast, options, flags)
    }
  }
}
