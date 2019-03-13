const chalk = require('chalk')
const assert = require('assert')
const { toFunc } = require('./utils')
const {
  PLUGIN_NAME,
  IF_FLAG, ELIF_FLAG, ELSE_FLAG,
  ELE_NODE, EXP_NODE, TXT_NODE,
  VUE_IF_DIR, VUE_PRE_DIR
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
  const expression = exps.map((exp, i) => `${i !== l ? '!' : ''}(${exp})`).join('&&')
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

function removeNode (nodeList, index) {
  const node = nodeList.splice(index, 1)[0]
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
    options[FLAGDIR]--
    if (keep) {
      transformNode(child, options, flags, useComment)
    } else {
      if (useComment) {
        replaceWithComment(child, dir, value)
      } else {
        removeNode(node.ifConditions || node.children, i)
        i = i - 1
      }
    }
  }
}

const WARN = Symbol('warn')
const HASERROR = Symbol('has-error')

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
        throw new Error(`\n${PLUGIN_NAME} template compiler:\n${chalk.red(msg)}\n`)
      }
    }
  }
  options[WARN](msg, node)
  options[HASERROR] = true
}

const FLAGDIR = Symbol('flagDir')

function postTransformNode (node, options, pluginOptions, useComment) {
  if (!node.parent && options[FLAGDIR] > 0) {
    if (options[HASERROR]) return
    transformNode(node, options, pluginOptions.flags, useComment)
    assert.ok(
      !(!options[HASERROR] && options[FLAGDIR] !== 0),
      `Sorry, there are some unexpected problems with ${PLUGIN_NAME}.`
    )
  }
}

function preTransformNode (node, options) {
  if (!node.parent) {
    options[FLAGDIR] = 0
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
      if (VUE_IF_DIR in attrsMap) {
        onError(options, `${dir} can not be used with ${VUE_IF_DIR}`, node)
      }
      if (VUE_PRE_DIR in attrsMap) {
        onError(options, `${dir} can not be used with ${VUE_PRE_DIR}`, node)
      }
      if (dir === IF_FLAG || dir === ELIF_FLAG) {
        if (value === '') {
          onError(options, `${dir} can not be empty`, node)
        }
      } else if (value !== '') {
        onError(options, `${dir} must be empty`, node)
      }
      removeFlagDir(node, dir)
      options[FLAGDIR]++
      node[flagMeta] = flagDirs[0]
    } else {
      onError(options, `"${flagDirs.map(v => v[0])}" can not be used on root element`, node)
    }
  } else {
    onError(options, `"${flagDirs.map(v => v[0])}" can not be used together`, node)
  }
}

module.exports = {
  preTransformNode,
  postTransformNode,
  staticKeys: [flagMeta]
}
