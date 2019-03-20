<template>
  <div>
    <h1>basic</h1>
    <div v-if-flag="a"> __a1-- </div>
    <hello-world></hello-world>
    <ul>
      <li v-if-flag="b">__b1--</li>
      <li v-else-flag>__b0--</li>
    </ul>
    <template></template>
    <span v-if-flag="c">__c1--</span>
    <span v-elif-flag="a">__c0_a1--</span>
    <span v-elif-flag="b">__c0_a0_b1--</span>
    <span v-else-flag>__c0_a0_b0--</span>
  </div>
</template>

<script title="basic test">
[
  {
    flags: { a: true, b: false, c: false },
    includes: [ 'a1', 'b0' ],
    excludes: [ 'c0_a0_b0' ]
  },
  {
    flags: { a: false, b: true, c: false },
    includes: [ 'b1' ],
    excludes: [ 'b0' ]
  },
]
</script>
