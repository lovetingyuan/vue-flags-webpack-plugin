<template>
  <div>
    <div v-if-flag="!a">@a0#</div>
    <div v-elif-flag="!b">@a1_b0#</div>
    <div v-elif-flag="!c && d">@a1_b1_c0_d1#</div>
    <p v-if-flag="!c && (a && !b && (!d && c))">@c0_a1_b0_d0_c1#</p>
  </div>
</template>
