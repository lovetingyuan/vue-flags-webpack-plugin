const { toFunc } = require('./utils')
const {
  PLUGIN_NAME,
  IF_FLAG, ELIF_FLAG, ELSE_FLAG,
  ELE_NODE, TXT_NODE,
  VUE_IF_DIR, VUE_ELSE_DIR, VUE_ELSE_IF_DIR,
  VUE_SLOT_DIR, VUE_SLOT_SCOPE
} = require('./constants')

const slotDirs = [VUE_SLOT_SCOPE, VUE_SLOT_DIR]
const conditionDirs = [VUE_IF_DIR, VUE_ELSE_IF_DIR, VUE_ELSE_DIR]
const flagDirs = [IF_FLAG, ELIF_FLAG, ELSE_FLAG]

const flagMeta = 'staticFlagMeta'

function evaluateFlagDir (node, options, flags) {
  const { exps, name, value } = node[flagMeta]
  const len = exps.length - 1
  const expression = exps.map((exp, i) => `${i !== len ? '!' : ''}(${exp || true})`).join('&&')
  try {
    return !!toFunc(expression).call(flags)
  } catch (err) {
    onError(options, `Unknown flag at: ${name}=${JSON.stringify(value)}, ${err.message}`, node)
  }
}

function removeAttribute (node, name) {
  delete node.attrsMap[name]
  if (node.rawAttrsMap) {
    delete node.rawAttrsMap[name]
  }
  const index = node.attrsList.findIndex(attr => attr.name === name)
  if (index !== -1) {
    node.attrsList.splice(index, 1)
  }
}

function hasAttribute (node, name) {
  return !!(
    (name in node.attrsMap) ||
    (node.rawAttrsMap && name in node.rawAttrsMap) ||
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
  HASERROR, HASFLAG, IFPROCESSED
] = [
  Symbol('has-error'),
  Symbol('has-flag'),
  Symbol('if-processed')
]

function onError (options, msg, node, tip) {
  const chalk = require('chalk')
  msg = (tip ? '\n' : '') +
    chalk[tip ? 'bgYellow' : 'bgRed'].black('', `${PLUGIN_NAME}:`, '') +
    ` ${msg} at ${serializeNode(node)}${serializeNode(node.children)}...`
  if (options.warn.length === 2) {
    options.warn(msg, tip)
  } else { // add in 2.6.0
    options.warn(msg, { start: node.start, end: node.end }, tip)
  }
  if (!options[HASERROR]) {
    options[HASERROR] = !tip
  }
}

function processElement (node, options, flags) {
  if (node.type !== ELE_NODE) return
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]
    if (child.ifConditions || !child[flagMeta]) {
      processElement(child, options, flags)
    } else {
      const keep = evaluateFlagDir(child, options, flags)
      if (typeof keep !== 'boolean') return
      if (!keep) {
        node.children.splice(i, 1)
        i--
      } else {
        processElement(child, options, flags)
      }
    }
  }
  if (node.ifConditions && !node.ifConditions[IFPROCESSED]) {
    node.ifConditions[IFPROCESSED] = true
    if (node.ifConditions.length > 1) {
      if (node[flagMeta]) {
        return onError(options, `v-*-flag can not be used with ${conditionDirs}`, node)
      }
      // node === node.ifConditions[0].block, so no need to process it again
      for (let i = 1; i < node.ifConditions.length; i++) {
        const conditionNode = node.ifConditions[i].block
        if (conditionNode[flagMeta]) {
          const keep = evaluateFlagDir(conditionNode, options, flags)
          if (typeof keep !== 'boolean') return
          if (!keep) {
            node.ifConditions.splice(i, 1)
            i--
          } else {
            processElement(conditionNode, options, flags)
          }
        } else {
          processElement(conditionNode, options, flags)
        }
      }
    } else if (node[flagMeta]) {
      const keep = evaluateFlagDir(node, options, flags)
      if (typeof keep !== 'boolean') return
      if (!keep) {
        const index = node.parent.children.indexOf(node)
        if (index !== -1) {
          node.parent.children.splice(index, 1)
        }
      }
    }
  }
  if (node.scopedSlots) {
    const slotNames = Object.keys(node.scopedSlots)
    for (let name of slotNames) {
      const scopedSlotNode = node.scopedSlots[name]
      if (scopedSlotNode[flagMeta]) {
        const keep = evaluateFlagDir(scopedSlotNode, options, flags)
        if (typeof keep !== 'boolean') return
        if (!keep) {
          delete node.scopedSlots[name]
        } else {
          processElement(scopedSlotNode, options, flags)
        }
      } else {
        processElement(scopedSlotNode, options, flags)
      }
    }
    if (!Object.keys(node.scopedSlots).length) {
      delete node.scopedSlots
    }
  }
}

function preTransformNode (ast, options) {
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
    return onError(options, `${dir} can not be used on root element(consider "files" option)`, ast)
  }
  if (dir === IF_FLAG || dir === ELIF_FLAG) {
    if (value === '') {
      return onError(options, `${dir} can not be empty`, ast)
    }
  } else if (value !== '') {
    return onError(options, `${dir} must be empty`, ast)
  }
  if (conditionDirs.some(dir => hasAttribute(ast, dir))) {
    onError(options, `Do not use v-*-flag with ${conditionDirs}`, ast, true)
  }
  const attrs = Object.keys(ast.attrsMap)
  removeAttribute(ast, dir) // avoid to affect optimization
  if (dir === IF_FLAG) {
    ast[flagMeta] = {
      exps: [value], name: dir, value, index: attrs.indexOf(dir)
    }
  } else {
    // not allow to use v-else-flag and v-elif-flag on scope slot node
    if (ast.parent.scopedSlots || slotDirs.some(dir => hasAttribute(ast, dir))) {
      return onError(options, `${dir} can not be used with ${slotDirs}`, ast)
    }
    const prevNode = findLastNode(ast)
    if (!prevNode || !prevNode[flagMeta]) {
      return onError(options, `${dir} must be next to ${IF_FLAG} or ${ELIF_FLAG}`, ast)
    }
    ast[flagMeta] = {
      exps: prevNode[flagMeta].exps.concat(value),
      name: dir,
      value,
      index: attrs.indexOf(dir)
    }
  }
  options[HASFLAG] = true
  return ast
}

module.exports = {
  staticKeys: [flagMeta],
  preTransformNode,
  postTransformNode (ast, options, { flags }) {
    if (!ast.parent && options[HASFLAG] && !options[HASERROR]) {
      processElement(ast, options, flags)
    }
  }
}
