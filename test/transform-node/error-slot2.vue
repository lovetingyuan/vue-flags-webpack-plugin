<template title="error for scoped slot 2" error='-flag can not be used with slot-scope,v-slot' flag="2">
  <div>
    <span slot="foo" slot-scope="Foo" v-if-flag="b" __b1-- :title="Foo"></span>
      <section v-if-flag="a">{{Foo}} __a1--</section>
    <div v-elif-flag="b">__a0_b1--</div>
  </div>
</template>
