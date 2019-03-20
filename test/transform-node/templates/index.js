const fs = require('fs')
const path = require('path')
const templates = {}
fs.readdirSync(__dirname).map(file => {
  if (path.extname(file) === '.vue') {
    templates[file.split('.')[0]] = fs.readFileSync(path.join(__dirname, file), 'utf8')
  }
})
module.exports = templates
