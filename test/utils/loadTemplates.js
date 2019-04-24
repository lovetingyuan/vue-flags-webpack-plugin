const fs = require('fs')
const path = require('path')

module.exports = (dir) => {
  return fs.readdirSync(dir).reduce((mp, file) => {
    if (path.extname(file) === '.vue' && file[0] !== '_') {
      mp[file.split('.')[0]] = fs.readFileSync(path.join(dir, file), 'utf8')
    }
    return mp
  }, {})
}
