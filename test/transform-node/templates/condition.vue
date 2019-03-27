<template title="condition-test">
  <section>
    <!-- test cases with v-if -->
    <h1>this is title</h1>
    <div v-if="foo">
      <div v-if-flag="a && b"> __a1_b1-- </div>
      <br>
      <a-compoent />
      <span v-if-flag="b"> __b1-- </span><!-- comment -->

      <span v-elif-flag="c && !d"> __b0_c1_d0--</span>
    </div>
    <div v-else-if="bar">
      <img src="" alt="">
      <div v-if-flag="c"> __c1-- </div>
      <span v-else-flag>__c0--</span>
    </div> 

    <div v-else>
      <ul v-if-flag="f">
        <span v-if="aaa">aaa</span>
        <li v-if-flag="d" v-else-if="bbb">__f1_d1--</li>
        <li v-elif-flag="e" v-else>__f1_d0_e1--</li>
        <li v-else-flag>__f1_d0_e0--</li>
      </ul>
    </div>
  </section>
</template>
