const { PLUGIN_NAME } = require('./constants')
const AFTERIF = 1
const AFTERELSEIF = 2
const AFTERELSE = 3
let currentStatus = 0
const exps = []

/**
 * v-if-flag
 * v-if-flag v-else-flag
 * v-if-flag v-elif-flag
 * v-if-flag v-elif-flag v-elif-flag
 * v-if-flag v-elif-flag v-else-flag
 * v-if-flag v-elif-flag v-elif-flag v-else-flag
 */
function evaluateFlagDir (exps, flags) {
  const l = exps.length - 1
  const expression = exps.map((exp, i) => `${i !== l ? '!' : ''}(${exp})`).join('&&')
  return new Function(`with(this){return (${expression})}`).call(flags) // eslint-disable-line
}

function checkFlagDir (node) {
  if (!node) return false
  if (node.type !== 1) return false
  if (!node.attrsMap) return false
  return ['v-if-flag', 'v-elif-flag', 'v-else-flag'].map(dir => {
    if (dir in node.attrsMap) {
      return [dir, node.attrsMap[dir].trim()]
    }
  }).filter(Boolean)
}

function removeFlagDir (node, dir) {
  if (node.directives) {
    const index = node.directives.findIndex(dirMeta => dirMeta.rawName === dir)
    if (index !== -1) {
      node.directives.splice(index, 1)
    }
  }
  if (!node.directives.length) {
    delete node.directives
  }
  delete node.attrsMap[dir]
  const index = node.attrsList.findIndex(attr => attr.name === dir)
  if (index !== -1) {
    node.attrsList.splice(index, 1)
  }
}

function replaceWithComment (node, dir) {
  const parent = node.parent
  const dirContent = node.attrsMap[dir]
  Object.keys(node).forEach(k => delete node[k])
  Object.assign(node, {
    type: 3,
    text: `removed by ${dir}=${JSON.stringify(dirContent)}`,
    parent,
    isComment: true
  })
}

function removeNode (node) {
  const parent = node.parent
  const childIndex = parent.children.indexOf(node)
  parent.children.splice(childIndex, 1)
  delete node.parent
}

function genFlagDirError (node, msg) {
  const nodeStr = `<${node.tag} ${node.attrsList.map(({ name, value }) => {
    return `${name}="${value}"`
  }).join(' ')}>...`
  return new Error(PLUGIN_NAME + ': ' + msg + '\n' + nodeStr)
}

function transformNode (ast, flags, useComment) {
  // TODO
  if (!ast) return
  const len = ast.children ? ast.children.length : 0
  for (let i = 0; i < len; i++) {
    const child = ast.children[i]
    const checkDir = checkFlagDir(child)
    if (!checkDir || !checkDir.length) {
      currentStatus = 0
      transformNode(child, flags, useComment)
      continue
    }
    if (checkDir.length > 1) {
      throw genFlagDirError(child, `flag directives "${checkDir.map(v => v[0])}" can not be used together.`)
    }
    const [[dir, value]] = checkDir
    switch (dir) {
      case 'v-if-flag': {
        if (value === '') {
          throw genFlagDirError(child, 'v-if-flag can not be empty')
        }
        currentStatus = AFTERIF
        exps.length = 0
        exps.push(value)
        break
      }
      case 'v-elif-flag': {
        if (value === '') {
          throw genFlagDirError(child, 'v-elif-flag can not be empty')
        }
        if (currentStatus !== AFTERIF && currentStatus !== AFTERELSEIF) {
          throw genFlagDirError(child, 'v-elif-flag must be next to v-if-flag or v-elif-flag')
        }
        currentStatus = AFTERELSEIF
        exps.push(value)
        break
      }
      case 'v-else-flag': {
        if (value !== '') {
          throw genFlagDirError(child, 'v-else-flag must be empty')
        }
        if (currentStatus !== AFTERIF && currentStatus !== AFTERELSEIF) {
          throw genFlagDirError(child, 'v-else-flag must be next to v-if-flag or v-elif-flag')
        }
        currentStatus = AFTERELSE
        exps.push(true)
        break
      }
    }
    let keep
    try {
      keep = evaluateFlagDir(exps, flags)
    } catch(e) {
      throw genFlagDirError(child, 'unknown flag name, ' + e.message)
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

module.exports = function (ast, pluginOptions, useComment) {
  if (!ast.parent) {
    const checkDir = checkFlagDir(ast)
    if (checkDir && checkDir.length) {
      throw genFlagDirError(ast, `flag directives "${checkDir.map(v => v[0])}" can not be used on root element`)
    }
    transformNode(ast, pluginOptions.flags, useComment)
  }
}
