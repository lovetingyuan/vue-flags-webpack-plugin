<template>
  <div>
    <div v-for="a in b" :key="a" v-if-flag="a">@a1#</div>
    <div v-elif-flag="b">@a0_b1#</div>
    <div v-elif-flag="c" v-for="c in d" :key="c">@a0_b0_c1#</div>
    <div v-else-flag>@a0_b0_c0#</div>
  </div>
</template>
