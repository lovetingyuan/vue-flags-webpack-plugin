<template title="for-test">
  <div>
    <div v-for="a in b" :key="a" v-if-flag="a">
      __a1-- {{a}}
    </div>
    <div v-for="c in d" :key="c" v-elif-flag="b">
      __a0_b1-- {{a}}
      <p v-if-flag="c">__a0_b1_c1--</p>
      <img v-else-flag src="__a0_b1_c0--">
    </div>
    <span v-else-flag>__a0_b0--</span>
  </div>
</template>
