<template title="scoped-slot">
  <div>
    <div slot="foo" slot-scope="Foo" :title="Foo" v-if-flag="a">
        __a1--
    </div>
    <span v-if-flag="b">__b1--</span>
    <section v-if-flag="c"> __c1--
      <div slot-scope="Bar" v-if-flag="d">{{Bar}} __c1_d1--</div>
    </section>
  </div>
</template>
