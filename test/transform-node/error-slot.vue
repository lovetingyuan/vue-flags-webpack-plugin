<template title="error for scoped slot" error='-flag can not be used with slot-scope,v-slot' flag="2">
  <div>
    <section v-if-flag="a">{{Foo}} __a1--</section>
    <div v-elif-flag="b">__a0_b1--</div>
    <span slot="foo" slot-scope="Foo" v-else-flag :title="Foo">__a0_b0--</span>
  </div>
</template>
