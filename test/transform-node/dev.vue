<template title="development" flags="a1_b0_c0">
  <div>
    <img>
    <div v-if="foo" slot="aaaa" slot-scope="foo">_aaa1--</div>
    <div v-else-if="foo" slot="bbbb" slot-scope="bar" v-if-flag="a">__a1-- {{bar}}</div>
    <div v-else slot="ccccc" slot-scope="far" v-elif-flag="c" :title="far">__a0_c1--</div>
    <p slot="ddddd" slot-scope="boo" v-else-flag>__a0_c0-- {{boo}}</p>
    <span></span>
  </div>
</template>
