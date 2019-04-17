/* global VueFlags */
import add from './add'
const a = VueFlags.a ? 'script:aaaaaaaaaaaaa' : 'script:noaaaaaaaaaaaaaa'
export default add(a)
