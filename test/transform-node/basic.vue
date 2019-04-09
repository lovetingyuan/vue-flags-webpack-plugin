<template title="basic-test">
  <div v-once>
    <h1 name="">basic</h1>
    <div v-if-flag="a"> __a1-- </div>
    <hello-world></hello-world>
    <ul>
      <li v-if-flag="b">__b1--</li>
      <li v-else-flag>__b0--</li>
    </ul>
    <template></template>
    <span v-if-flag="c">__c1--</span>

    <!--foo-->
    <span v-elif-flag="a">__c0_a1--</span>  <!--bar-->
    <span v-elif-flag="b">__c0_a0_b1--</span>
    <span v-else-flag>__c0_a0_b0--</span>

    <component v-if-flag="d" :is="helloworld">
      __d1--
    </component>
    <span v-else-flag>__d0--</span>
  </div>
</template>
