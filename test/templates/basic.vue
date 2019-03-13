<template>
  <div>
    <h1>basic</h1>
    <div v-if-flag="basic_a"> basic_a1-- </div>
    <hello-world></hello-world>
    <ul>
      <li v-if-flag="basic_b">basic_b1--</li>
      <li v-else-flag>basic_b0--</li>
    </ul>
    <template></template>
    <span v-if-flag="basic_c">basic_c1--</span>
    <span v-elif-flag="basic_a">basic_c0_a1--</span>
    <span v-elif-flag="basic_b">basic_c0_a0_b1--</span>
    <span v-else-flag>basic_c0_a0_b0--</span>
  </div>
</template>

<script>
function basicTest() {
  const texts = [
    'basic_a1', 'basic_b1', 'basic_b0', 'basic_c1', 'basic_c0_a1', 'basic_c0_a0_b1', 'basic_c0_a0_b0'
  ]
  const flags = [ 'a', 'b', 'c' ]
  return {
    texts, flags
  }
}
</script>
