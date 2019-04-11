<template title="scoped-slot">
  <div>
    <span v-if-flag="b">__b1--</span>
    <section v-elif-flag="c"> __b0_c1--
      <slot name="aaa" v-if-flag="f">__b0_c1_f1--</slot>
      <img v-else-flag src="__b0_c1_f0--">
      <span v-if-flag="e" slot-scope="ABC" slot="Boo">
        __b0_c1_e1-- {{ABC}}
      </span>
      <div slot-scope="Bar" v-if-flag="d">{{Bar}} __b0_c1_d1--</div>
    </section>
    <div slot="foo" slot-scope="Foo" :title="Foo" v-if-flag="d">
      <span v-if-flag="a"> __d1_a1--</span>
      <p v-else-flag>__d1_a0--</p>
    </div>
  </div>
</template>
