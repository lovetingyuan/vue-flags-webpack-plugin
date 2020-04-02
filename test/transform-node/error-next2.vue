<template error="v-elif-flag must be next to v-if-flag">
  <div>
    <div v-if-flag="a">@a1#</div>
    text
    <div v-elif-flag="b">@a0_b1#</div>
  </div>
</template>
