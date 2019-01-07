import Vue from 'vue'
import App from './App.vue'
import './style.less';

Vue.config.productionTip = false
console.log(flags)

// if (flags.A) {
//   const requireTest = require.context('./plugins', true, /\.js$/);
//   requireTest.keys().forEach(name => {
//     const ret = requireTest(name)
//     ret();
//   });
// }

new Vue({
  render: h => h(App),
}).$mount('#app')
