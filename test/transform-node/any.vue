<template title="any test" flag="4">
  <m-a v-if="foo">
    <span v-if-flag="c">__c1--</span><a v-else-flag __c0--></a>

    <template slot="aa" slot-scope="a" v-if-flag="a">__a1--</template>
    <template slot slot-scope="b" v-if-flag="b">__b1--</template>
  </m-a>
  <t-a v-else>
    <span v-if-flag="d">__d1--</span>
    <br v-else-flag __d0-->
    <section v-if-flag="d">
      <input :type="dynamic" v-if-flag="a" value="__d1_a1--">
      <input :type="dynamic" v-if="data" v-elif-flag="c" value="__d1_a0_c1--">
    </section>
  </t-a>
</template>
