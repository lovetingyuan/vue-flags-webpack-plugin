const { PLUGIN_NAME, IF_FLAG, ELSE_FLAG, ELIF_FLAG } = require('./constants')
const [INITSTATUS, AFTERIF, AFTERELSEIF, AFTERELSE] = [0, 1, 2, 3]

function evaluateFlagDir (exps, flags) {
  const l = exps.length - 1
  const expression = exps.map((exp, i) => `${i !== l ? '!' : ''}(${exp})`).join('&&')
  return new Function(`with(this){return (${expression})}`).call(flags) // eslint-disable-line
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
    text: `Removed by ${PLUGIN_NAME} due to ${dir}=${JSON.stringify(dirContent)}`,
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
  if (!ast.children) return
  let currentStatus = INITSTATUS
  const exps = []
  // ast is dynamic
  for (let i = 0; i < ast.children.length; i++) {
    const child = ast.children[i]
    const checkDir = checkFlagDir(child)
    if (!checkDir || !checkDir.length) {
      currentStatus = INITSTATUS
      transformNode(child, flags, useComment)
      continue
    }
    if (checkDir.length > 1) {
      throw genFlagDirError(child, `flag directives "${checkDir.map(v => v[0])}" can not be used together.`)
    }
    const [[dir, value]] = checkDir
    switch (dir) {
      case IF_FLAG: {
        if (value === '') {
          throw genFlagDirError(child, `${IF_FLAG} can not be empty`)
        }
        currentStatus = AFTERIF
        exps.length = 0
        exps.push(value)
        break
      }
      case ELIF_FLAG: {
        if (value === '') {
          throw genFlagDirError(child, `${ELIF_FLAG} can not be empty`)
        }
        if (currentStatus !== AFTERIF && currentStatus !== AFTERELSEIF) {
          throw genFlagDirError(child, `${ELIF_FLAG} must be next to ${IF_FLAG} or ${ELIF_FLAG}`)
        }
        currentStatus = AFTERELSEIF
        exps.push(value)
        break
      }
      case ELSE_FLAG: {
        if (value !== '') {
          throw genFlagDirError(child, `${ELSE_FLAG} must be empty`)
        }
        if (currentStatus !== AFTERIF && currentStatus !== AFTERELSEIF) {
          throw genFlagDirError(child, `${ELSE_FLAG} must be next to ${IF_FLAG} or ${ELIF_FLAG}`)
        }
        currentStatus = AFTERELSE
        exps.push(true)
        break
      }
    }
    try {
      var keep = evaluateFlagDir(exps, flags)
    } catch (e) {
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

module.exports = function (ast, options, pluginOptions, useComment) {
  if (!ast.parent) {
    const checkDir = checkFlagDir(ast)
    if (checkDir && checkDir.length) {
      throw genFlagDirError(ast, `flag directives "${checkDir.map(v => v[0])}" can not be used on root element`)
    }
    transformNode(ast, pluginOptions.flags, useComment)
  }
}
