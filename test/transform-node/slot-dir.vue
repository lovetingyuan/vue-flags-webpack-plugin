<template title="test for v-slot" min-version="2.6.0">
<!--
  v-slot only could be used on template(on top level of component children) or component
  and can not be used on template and component together
-->
  <div>
    <span v-if-flag="a">__a1--</span>
    <span v-else-flag>__a0--</span>
    <hello v-if-flag="e">
      <template v-slot="b" v-if-flag="f"> __e1_f1--
        <span v-if-flag="a">__e1_f1_a1--</span>
        <span v-else-flag>__e1_f1_a0--</span>
      </template>
      <template v-slot:footer v-if-flag="d">__e1_d1--</template>
      <template v-slot:header="a" v-if-flag="b">__e1_b1--</template>
    </hello>
    <img v-if-flag="b" src="__b1--">
    <img v-elif-flag="d" src="__b0_d1--">
    <hello-2 v-slot="foo" v-if-flag="c"> __c1--
      <span v-if-flag="d">__c1_d1--</span>
      <span v-elif-flag="e">__c1_d0_e1--</span>
    </hello-2>
  </div>
</template>
