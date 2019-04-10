<template title="slot-test">
  <div>
    <hello>
      <template slot="foo" v-if-flag="e">
        <span v-if-flag="a">__e1_a1--</span>
        <span v-elif-flag="b">__e1_a0_b1--</span>
        <span v-else-flag>__e1_a0_b0--</span>
      </template>
      <template slot="bar" v-if-flag="b"> {{props}}
        <span v-if-flag="d">__b1_d1--</span>
        <span v-else-flag>__b1_d0--</span>
      </template>
      <span v-else-flag slot="foot">
        <span v-if-flag="c">__b0_c1--</span>
        <span v-else-flag>__b0_c0--</span>
      </span>
    </hello>
    <div slot="bar">
      <my-app>

        <slot name="foo" v-if-flag="b">
          <a v-if-flag="f">       __b1_f1--     </a>
          <img v-elif-flag="a" src="__b1_f0_a1--">
        </slot>
        <section v-elif-flag="a">__b0_a1--</section>
        <slot v-else-flag>__b0_a0--</slot>
      </my-app>

    </div>
  </div>
</template>

