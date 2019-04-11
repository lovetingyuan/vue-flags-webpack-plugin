<template title="error for condition" error="-flag can not be used with v-if" flag="2">
  <div>
    <li v-if="foo" v-if-flag="a">__a1--</li>
    <li v-else>this is else</li>
  </div>
</template>
