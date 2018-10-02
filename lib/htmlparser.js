const { parseHTML, makeMap } = require('./vue-htmlparser')

const isUnaryTag = makeMap(
  'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +
  'link,meta,param,source,track,wbr'
)

const canBeLeftOpenTag = makeMap(
  'colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source'
)

let div
function getShouldDecode (href) {
  if ([typeof window, typeof document].includes('undefined')) { return false }
  div = div || document.createElement('div')
  div.innerHTML = href ? `<a href="\n"/>` : `<div a="\n"/>`
  return div.innerHTML.indexOf('&#10;') > 0
}

module.exports = function parse (html, loaderContext) {
  const stack = []
  let root
  let currentParent

  parseHTML(html, {
    expectHTML: true,
    shouldKeepComment: true,
    warn (msg) {
      msg = `[Vue template parser]: ${msg}`
      if (!loaderContext) {
        console.warn(msg)
      } else {
        loaderContext.emitWarning(new Error(msg))
      }
    },
    // void elements
    isUnaryTag,
    // Elements that you can, intentionally, leave open
    // (and which close themselves)
    canBeLeftOpenTag,
    // #3663: IE encodes newlines inside attribute values while other browsers don't
    shouldDecodeNewlines: getShouldDecode(false),
    // #6828: chrome encodes content in a[href]
    shouldDecodeNewlinesForHref: getShouldDecode(true),
    start (tag, attrs, unary) {
      const attribs = Object.create(null)
      for (let { name, value } of attrs) {
        attribs[name] = value
      }
      let element = {
        type: 'tag',
        name: tag,
        attribs,
        parent: currentParent,
        children: []
      }
      if (!root) {
        root = element
      }
      if (currentParent) {
        currentParent.children.push(element)
        element.parent = currentParent
      }
      if (!unary) {
        currentParent = element
        stack.push(element)
      }
    },
    end (tag) { // eslint-disable-line
      stack.length -= 1
      currentParent = stack[stack.length - 1]
    },
    chars (text) {
      if (!currentParent || !text) return
      currentParent.children.push({
        type: 'text',
        data: text
      })
    },
    comment (text) {
      currentParent.children.push({
        type: 'comment',
        data: text
      })
    }
  })

  return [root]
}
