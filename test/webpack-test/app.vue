<template>
  <div>
    <h3>{{title}}</h3>
    <span v-if-flag="a">
      _a1___
      <span v-if-flag="b">_a1_b1___</span>
      <span v-else-flag>_a1_b0___</span>
      <slot></slot>
      <span v-if-flag="c">_a1_c1___</span>
      <span v-elif-flag="d">_a1_c0_d1___</span>
      <span v-elif-flag="e">_a1_c0_d0_e1___</span>
    </span>
    <span v-elif-flag="f">_a0_f1___</span>
    <span v-else-flag>_a0_f0___</span>
  </div>
</template>
<script>
export default {
  data() {
    return {title: vueFlagsWebpackPlugin.TITLE ? 'TITLETITLETITLETITLETITLE' : 'NOTITLETITLETITLE'}
  }
}
</script>
