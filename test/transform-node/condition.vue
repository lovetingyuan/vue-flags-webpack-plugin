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
      <ul v-if-flag="e">
        <template v-if-flag="d">
          <li v-if="aaa">__e1_d1--</li>
          <li v-else-if="bbb">

            <div v-if-flag="f">__e1_d1_f1--</div>

                      <div v-elif-flag="a">__e1_d1_f0_a1--</div>
<slot></slot>
          </li>
          <li v-else></li>
        </template>
        <li v-else-flag>__e1_d0--</li>
      </ul>
    </div>
  </section>
</template>
