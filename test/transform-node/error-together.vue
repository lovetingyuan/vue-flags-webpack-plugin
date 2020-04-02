<template error="v-elif-flag,v-else-flag can not be used together">
  <div>
    <div v-if-flag="a">@a#</div>
    <div v-elif-flag="b" v-else-flag></div>
  </div>
</template>
