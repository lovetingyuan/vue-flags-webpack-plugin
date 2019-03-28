<template min-version="2.6.0" title="slot-test">
  <div>
    <hello>
      <template slot="foo" v-if-flag="e">
        <span v-if-flag="a">__e1_a1--</span>
        <span v-elif-flag="b">__e1_a0_b1--</span>
        <span v-else-flag>__e1_a0_b0--</span>
      </template>
      <template slot="bar" slot-scope="props" v-if-flag="b"> {{props}}
        <span v-if-flag="d">__b1_d1--</span>
        <span v-else-flag>__b1_d0--</span>
      </template>
      <span v-else-flag slot="foot">
        <span v-if-flag="a">__b0_a1--</span>
        <span v-else-flag>__b0_a0--</span>
      </span>
    </hello>

  </div>
</template>

