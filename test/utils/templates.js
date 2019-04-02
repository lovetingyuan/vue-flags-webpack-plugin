const fs = require('fs')
const path = require('path')

module.exports = (dir) => {
  const templates = {}
  fs.readdirSync(dir).map(file => {
    if (path.extname(file) === '.vue') {
      templates[file.split('.')[0]] = fs.readFileSync(path.join(dir, file), 'utf8')
    }
  })
  return templates
}
