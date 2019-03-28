<template title="nest-test">
  <div>
    <h1>basic</h1>
    <div v-if-flag="a"> __a1-- </div>
    <hello-world></hello-world>
    <ul v-if-flag="b">
      __b1--
      <li v-if-flag="c">__b1_c1--</li>
      <li v-elif-flag="f">__b1_c0_f1--</li>
      <img v-else-flag src="__b1_c0_f0--">
      <a v-if-flag="d">__b1_d1--</a>
      <a v-else-flag>__b1_d0--
        <span v-if-flag="c">__b1_d0_c1--</span>
        <span v-elif-flag="a">__b1_d0_c0_a1--

          <input v-if-flag="e" value="__b1_d0_c0_a1_e1--">
          <input v-elif-flag="f" value="__b1_d0_c0_a1_e0_f1--">
          <input v-else-flag value="__b1_d0_c0_a1_e0_f0--">
        </span>
      </a>
      <h1></h1>
      <a v-if-flag="e">__b1_e1--</a>
    </ul>
    <i v-else-flag> __b0-- </i>
  </div>
</template>

