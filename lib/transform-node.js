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
          onError(options, msg, child)
        }
        refErrors[message] = true
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

function onError (options, msg, ast) {
  if (!options[WARN]) {
    options[WARN] = function (msg, ast) {
      if (!options.outputSourceRange || !options.warn) {
        msg = `${msg} at ${serializeNode(ast)}${serializeNode(ast.children)}...`
      }
      if (options.warn) {
        options.warn(msg, options.outputSourceRange ? {
          start: ast.start, end: ast.end
        } : void 0)
      } else {
        throw new Error(`\n${PLUGIN_NAME} template compiler:\n${chalk.red(msg)}\n`)
      }
    }
  }
  options[WARN](msg, ast)
}

let hasFlagDir = false

function postTransformNode (ast, options, pluginOptions, useComment) {
  if (!ast.parent && hasFlagDir) {
    hasFlagDir = false
    transformNode(ast, options, pluginOptions.flags, useComment)
  }
}

function preTransformNode (ast, options) {
  if (!ast.parent) {
    hasFlagDir = false
  }
  const flagDirs = []
  const { attrsMap } = ast
  if (IF_FLAG in attrsMap) {
    flagDirs.push([IF_FLAG, attrsMap[IF_FLAG].trim()])
  }
  if (ELIF_FLAG in attrsMap) {
    flagDirs.push([ELIF_FLAG, attrsMap[ELIF_FLAG].trim()])
  }
  if (ELSE_FLAG in attrsMap) {
    flagDirs.push([ELSE_FLAG, attrsMap[ELSE_FLAG].trim()])
  }
  if (flagDirs.length) {
    if (!ast.parent) {
      onError(options, `"${flagDirs.map(v => v[0])}" can not be used on root element`, ast)
    }
    if (flagDirs.length > 1) {
      onError(options, `"${flagDirs.map(v => v[0])}" can not be used together`, ast)
    }
    const [[dir, value]] = flagDirs
    if (dir === IF_FLAG || dir === ELIF_FLAG) {
      if (value === '') {
        onError(options, `${dir} can not be empty`, ast)
      }
    } else if (value !== '') {
      onError(options, `${dir} must be empty`, ast)
    }
    removeFlagDir(ast, dir)
    hasFlagDir = true
    ast[flagMeta] = flagDirs[0]
  }
}

module.exports = {
  preTransformNode,
  postTransformNode,
  staticKeys: [flagMeta]
}
