<template error='Unknown flag at: v-elif-flag="b && foo"'>
  <div>
    <div v-if-flag="a">@a1#</div>
    <div v-elif-flag="b && foo">@a0_b1_foo1#</div>
  </div>
</template>
