const chalk = require('chalk')
const { toFunc } = require('./utils')
const { PLUGIN_NAME, IF_FLAG, ELSE_FLAG, ELIF_FLAG } = require('./constants')
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
  if (node.type !== 1) return false
  return [IF_FLAG, ELIF_FLAG, ELSE_FLAG].map(dir => {
    if (dir in node.attrsMap) {
      return [dir, node.attrsMap[dir].trim()]
    }
  }).filter(Boolean)
}

function removeFlagDir (node, dir) {
  if (node.directives) {
    const index = node.directives.findIndex(({ rawName }) => rawName === dir)
    if (index !== -1) {
      node.directives.splice(index, 1)
    }
  }
  if (!node.directives.length) {
    delete node.directives
  }
  delete node.attrsMap[dir]
  const index = node.attrsList.findIndex(({ name }) => name === dir)
  if (index !== -1) {
    node.attrsList.splice(index, 1)
  }
}

function replaceWithComment (node, dir) {
  const dirContent = node.attrsMap[dir]
  Object.keys(node).forEach(k => {
    if (k !== 'parent') { delete node[k] }
  })
  Object.assign(node, {
    type: 3,
    text: `<${node.tag}> was removed due to ${dir}=${JSON.stringify(dirContent)}`,
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
  if (node.type === 1) {
    const attrs = Object.keys(node.attrsMap).map(k => {
      return `${k}=${JSON.stringify(node.attrsMap[k])}`
    }).join(' ')
    return `<${node.tag}${attrs ? ' ' + attrs : ''}>`
  }
  if (node.type === 2 || node.type === 3) {
    return node.isComment ? `<!--${node.text}-->` : node.text
  }
  return ''
}

function genFlagDirError (node, msg) {
  const template = getNodeStr(node) + getNodeStr(node.children)
  return new Error(`${PLUGIN_NAME} template compiler:\n  ${chalk.red(`${msg} at ${template}...`)}`)
}

function transformNode (ast, flags, useComment) {
  if (!ast.children) return
  let currentStatus = INITSTATUS
  const exps = []
  // ast is dynamic
  for (let i = 0; i < ast.children.length; i++) {
    const child = ast.children[i]
    const checkDir = checkFlagDir(child)
    if (!checkDir) { // child is not an element
      // only blank node or comment could exist between flag directive nodes
      if (!(child.type === 3 && (!child.text.trim() || child.isComment))) {
        currentStatus = INITSTATUS
      }
      continue
    }
    if (!checkDir.length) { // child does not contain flag directives
      currentStatus = INITSTATUS
      transformNode(child, flags, useComment)
      continue
    }
    if (checkDir.length > 1) {
      throw genFlagDirError(child, `"${checkDir.map(v => v[0])}" can not be used together.`)
    }
    const [[dir, value]] = checkDir
    if (dir === IF_FLAG || dir === ELIF_FLAG) {
      if (value === '') throw genFlagDirError(child, `${dir} can not be empty`)
    } else {
      if (value !== '') throw genFlagDirError(child, `${dir} must be empty`)
    }
    if (dir === ELIF_FLAG || dir === ELSE_FLAG) {
      if (currentStatus !== AFTERIF && currentStatus !== AFTERELSEIF) {
        throw genFlagDirError(child, `${dir} must be next to ${IF_FLAG} or ${ELIF_FLAG}`)
      }
    } else { // all checking passed
      exps.length = 0 // clear expressions when the directive is v-if-flag
    }
    currentStatus = STATUSMAP[dir]
    exps.push(value || true)
    try {
      var keep = evaluateFlagDir(exps, flags)
    } catch (e) {
      throw genFlagDirError(child, 'Unknown flag name, ' + e.message)
    }
    if (keep) {
      removeFlagDir(child, dir)
      transformNode(child, flags, useComment)
    } else {
      if (useComment) {
        replaceWithComment(child, dir)
      } else {
        removeNode(child)
        i = i - 1
      }
    }
  }
}

module.exports = function (ast, options, pluginOptions, useComment) {
  if (!ast.parent) {
    const checkDir = checkFlagDir(ast)
    if (checkDir && checkDir.length) {
      throw genFlagDirError(ast, `"${checkDir.map(v => v[0])}" can not be used on root element`)
    }
    transformNode(ast, pluginOptions.flags, useComment)
  }
}
