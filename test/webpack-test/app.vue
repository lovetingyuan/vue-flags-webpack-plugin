<template>
  <div>
    <h3>{{title}}</h3>
    <section v-if="title" title="111">
      <span v-if-flag="a">aaaaa</span>
      <span v-elif-flag="b">bbbb</span>
      <p v-else-flag>nothing</p>
    </section>
    <p v-else title="aaa">
      <span v-if-flag="a" title="222">
        _a1___
        <span v-if-flag="b" title="333">_a1_b1___</span>
        <span v-else-flag title="444">_a1_b0___</span>
        <slot></slot>
        <span v-if-flag="c" title="555">_a1_c1___</span>
        <span v-elif-flag="d" title="666">_a1_c0_d1___</span>
        <span v-elif-flag="e" title="777">_a1_c0_d0_e1___</span>
      </span>
      <span v-elif-flag="f" title="888">_a0_f1___</span>
      <span v-else-flag title="999">_a0_f0___</span>
    </p>
  </div>
</template>
<script>
export default {
  data() {
    return {title: vueFlagsWebpackPlugin.TITLE ? 'TITLETITLETITLETITLETITLE' : 'NOTITLETITLETITLE'}
  }
}
</script>
