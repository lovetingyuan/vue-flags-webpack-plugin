const { toFunc } = require('./utils')
const {
  PLUGIN_NAME,
  IF_FLAG, ELIF_FLAG, ELSE_FLAG,
  ELE_NODE, EXP_NODE, TXT_NODE
  // VUE_IF_DIR, VUE_PRE_DIR
} = require('./constants')

const flagMeta = 'staticFlagMeta'
const nodeIndex = 'staticNodeIndex'

function evaluateFlagDir (exps, flags) {
  const l = exps.length - 1
  const expression = exps.map((exp, i) => `${i !== l ? '!' : ''}(${exp || true})`).join('&&')
  return toFunc(expression).call(flags)
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
const INDEX = Symbol('node-index')

function onError (options, msg, node) {
  if (!options[WARN]) {
    options[WARN] = function (msg, node) {
      if (!options.outputSourceRange || !options.warn) {
        msg = `${msg} at ${serializeNode(node)}${serializeNode(node.children)}...`
      }
      if (options.warn) {
        options.warn(msg, options.outputSourceRange ? {
          start: node.start, end: node.end
        } : void 0)
      } else {
        let chalk
        try { chalk = require('chalk') } catch (e) {}
        throw new Error(`\n${PLUGIN_NAME} template compiler:\n${chalk ? chalk.red(msg) : msg}\n`)
      }
    }
  }
  options[WARN](msg, node)
  options[HASERROR] = true
}

function transformNode (node, options, flags) {
  if (node.type !== ELE_NODE) return
  let children = []
  if (node.ifConditions) {
    if (node.ifConditions[IFPROCESSED]) {
      children = node.children
    } else {
      node.ifConditions[IFPROCESSED] = true
      for (let i = 0; i < node.ifConditions.length; i++) {
        const conditionNode = node.ifConditions[i].block
        if (conditionNode[flagMeta]) {
          const keep = evaluateFlagDir(conditionNode[flagMeta], flags)
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
        const keep = evaluateFlagDir(slotNode[flagMeta], flags)
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
      const keep = evaluateFlagDir(child[flagMeta], flags)
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
  postTransformNode (ast, options, flags) {
    if (!ast.parent && options[HASFLAG] && !options[HASERROR]) {
      transformNode(ast, options, flags.flags ? flags.flags : flags)
    }
  },
  preTransformNode (ast, options) {
    if (options[HASERROR]) return
    if (!ast.parent) {
      ast[nodeIndex] = options[INDEX] = 0
      options[HASFLAG] = false
      options[HASERROR] = false
    } else {
      ast[nodeIndex] = ++options[INDEX]
    }
    const { attrsMap } = ast
    const flagDirs = [IF_FLAG, ELSE_FLAG, ELIF_FLAG].map(f => {
      if (f in attrsMap) {
        return [f, attrsMap[f].trim()]
      }
    }).filter(Boolean)
    if (!flagDirs.length) return ast
    if (flagDirs.length > 1) {
      onError(options, `"${flagDirs.map(v => v[0])}" can not be used together`, ast)
    }
    const [[dir, value]] = flagDirs
    // ;[VUE_IF_DIR, VUE_PRE_DIR].forEach(f => {
    //   if (f in attrsMap) {
    //     onError(options, `${dir} can not be used with ${f}`, ast)
    //   }
    // })
    if (dir === IF_FLAG || dir === ELIF_FLAG) {
      if (value === '') {
        onError(options, `${dir} can not be empty`, ast)
      }
    } else if (value !== '') {
      onError(options, `${dir} must be empty`, ast)
    }
    removeFlagDir(ast, dir)
    if (dir === IF_FLAG) {
      options[HASFLAG] = ast[flagMeta] = [value]
      return ast
    }
    let prevNode = ast.parent.children.slice(-1)[0]
    if (prevNode.type !== 1) {
      if (prevNode.text.trim() && !prevNode.isComment) {
        throw new Error(`${dir} must be next to v-if-flag or v-elif-flag.`)
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
    if (prevNode.type !== 1 || !prevNode[flagMeta]) {
      throw new Error('Unexpected error in vue-flags-webpack-plugin at: ' + serializeNode(prevNode) + ', ' + serializeNode(ast))
    }
    options[HASFLAG] = ast[flagMeta] = prevNode[flagMeta].concat(value)
    return ast
  }
}
