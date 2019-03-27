const { toFunc } = require('./utils')
const {
  PLUGIN_NAME,
  IF_FLAG, ELIF_FLAG, ELSE_FLAG,
  ELE_NODE, EXP_NODE, TXT_NODE,
  FORBIDDEN_DIRS
  // VUE_IF_DIR, VUE_PRE_DIR
} = require('./constants')

const [INITSTATUS, AFTERIF, AFTERELSEIF, AFTERELSE] = [0, 1, 2, 3]
const STATUSMAP = {
  [IF_FLAG]: AFTERIF,
  [ELIF_FLAG]: AFTERELSEIF,
  [ELSE_FLAG]: AFTERELSE
}
const flagMeta = 'staticFlagMeta'

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
  if (!node.parent) return
  const parent = node.parent
  if (parent.children) {
    const index = parent.children.indexOf(node)
    if (index !== -1) {
      parent.children.splice(index, 1)
    }
  }
  if (parent.ifConditions) {
    const index = parent.ifConditions.indexOf(node)
    if (index !== -1) {
      parent.ifConditions.splice(index, 1)
    }
  }
  if (parent.scopedSlots) {
    const name = Object.keys(parent.scopedSlots).find(name => {
      return parent.scopedSlots[name] === node
    })
    if (name) {
      delete parent.scopedSlots[name]
    }
  }
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

const IFPROCESSED = Symbol('if-processed')

function transformNode (node, options, flags, useComment) {
  if (node.type !== ELE_NODE) return
  let nodes
  // need check v-if nodes, because vue treats them as one child
  if (node.ifConditions && !node.ifConditions[IFPROCESSED]) {
    node.ifConditions[IFPROCESSED] = true
    nodes = node.ifConditions.map(({ block }) => block)
  } else if (node.scopedSlots) { // handle v-slot, add in vue 2.6
    Object.keys(node.scopedSlots).forEach(name => {
      transformNode(node.scopedSlots[name], options, flags, useComment)
    })
    nodes = node.children
  } else {
    nodes = node.children
  }
  if (!nodes || !nodes.length) return
  let currentStatus = INITSTATUS
  const exps = []
  let refErrors = {}
  // nodes is dynamic
  for (let i = 0; i < nodes.length; i++) {
    const child = nodes[i]
    if (child.type !== ELE_NODE) {
      // only blank node or comment could exist between flag directive nodes
      if (!(child.type === TXT_NODE && (!child.text.trim() || child.isComment))) {
        currentStatus = INITSTATUS
      }
      continue
    }
    if (!child[flagMeta]) {
      currentStatus = INITSTATUS
      transformNode(child, options, flags, useComment)
      continue
    }
    const [dir, value] = child[flagMeta]
    if (dir === ELIF_FLAG || dir === ELSE_FLAG) {
      if (currentStatus !== AFTERIF && currentStatus !== AFTERELSEIF) {
        onError(options, `${dir} must be next to ${IF_FLAG} or ${ELIF_FLAG}`, child)
      }
    } else { // all checking passed
      refErrors = {}
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
        if (!refErrors[msg]) {
          onError(options, msg, child)
        }
        refErrors[msg] = true
      } else {
        onError(options, msg, child)
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

const WARN = Symbol('warn')
const HASERROR = Symbol('has-error')
const HASFLAG = Symbol('has-flag')

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

function postTransformNode (node, options, pluginOptions, useComment) {
  if (!node.parent && options[HASFLAG] && !options[HASERROR]) {
    transformNode(node, options, pluginOptions.flags, useComment)
  }
}

function preTransformNode (node, options) {
  if (!node.parent) {
    options[HASFLAG] = false
    options[HASERROR] = false
  }
  const flagDirs = []
  const { attrsMap } = node
  if (IF_FLAG in attrsMap) {
    flagDirs.push([IF_FLAG, attrsMap[IF_FLAG].trim()])
  }
  if (ELIF_FLAG in attrsMap) {
    flagDirs.push([ELIF_FLAG, attrsMap[ELIF_FLAG].trim()])
  }
  if (ELSE_FLAG in attrsMap) {
    flagDirs.push([ELSE_FLAG, attrsMap[ELSE_FLAG].trim()])
  }
  if (!flagDirs.length) return
  if (flagDirs.length === 1) {
    if (node.parent) {
      const [[dir, value]] = flagDirs
      if (FORBIDDEN_DIRS.some(forbiddenDir => {
        if (forbiddenDir in attrsMap) {
          onError(options, `${dir} can not be used with ${forbiddenDir}`, node)
          return true
        }
      })) {
        return
      }
      if (dir === IF_FLAG || dir === ELIF_FLAG) {
        if (value === '') {
          onError(options, `${dir} can not be empty`, node)
        }
      } else if (value !== '') {
        onError(options, `${dir} must be empty`, node)
      }
      removeFlagDir(node, dir)
      options[HASFLAG] = true
      node[flagMeta] = flagDirs[0]
    } else {
      onError(options, `"${flagDirs.map(v => v[0])}" can not be used on root element`, node)
    }
  } else {
    onError(options, `"${flagDirs.map(v => v[0])}" can not be used together`, node)
  }
}

function _transformNode(node, options, flags) {
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
            _transformNode(conditionNode, options, flags)
          }
        } else {
          _transformNode(conditionNode, options, flags)
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
          _transformNode(slotNode)
        }
      } else {
        _transformNode(slotNode)
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
        _transformNode(child, options, flags)
      }
    } else {
      _transformNode(child, options, flags)
    }
  }
}

module.exports = {
  preTransformNode,
  postTransformNode,
  staticKeys: [flagMeta],
  _postTransformNode (ast, options, flags) {
    if (!ast.parent && options[HASFLAG] && !options[HASERROR]) {
      _transformNode(ast, options, flags)
    }
  },
  _preTransformNode (ast, options) {
    if (options[HASERROR]) return
    if (!ast.parent) {
      options[HASFLAG] = false
      options[HASERROR] = false
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
    }
    if (prevNode.type !== 1 || !prevNode[flagMeta] || options[HASFLAG] !== prevNode[flagMeta]) {
      throw new Error('Unexpected error in vue-flags-webpack-plugin at: ' + serializeNode(prevNode))
    }
    options[HASFLAG] = ast[flagMeta] = prevNode[flagMeta].concat(value)
    return ast
  }
}
