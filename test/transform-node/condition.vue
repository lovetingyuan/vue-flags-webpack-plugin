<template title="condition-test" tip="Do not use v-*-flag with">
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
      <ul v-if-flag="f"> __f1--
        <li v-if="foo" v-if-flag="d">__f1_d1--</li>
        <li v-if="bar" v-elif-flag="e">__f1_d0_e1--</li>
        <li v-else-flag title="__f1_d0_e0--"></li>
      </ul>
      <template v-else-flag>__f0--</template>
      <div v-if="boo">
        <section v-if="foo"></section>
        <section v-else-if="bar" v-if-flag="e">__e1--</section>
        <section v-else-flag>__e0--</section>
      </div>
      <div v-else v-if-flag="d">
        <section v-if="far">__d1--</section>
        <section v-else-if="bar" v-if-flag="a">__d1_a1--</section>
        <section v-else v-else-flag>__d1_a0--</section>
      </div>
      <div v-else-flag> __d0--
        <div v-if-flag="a">__d0_a1--</div>
        <section v-if="far" v-elif-flag="b">__d0_a0_b1--</section>
        <section v-elif-flag="f">__d0_a0_b0_f1--</section>
        <section v-if="boo" v-else-flag>__d0_a0_b0_f0--</section>
      </div>
      <ul v-if="list" v-if-flag="a">__a1--</ul>
      <img v-else-flag src="__a0--">
    </div>
  </section>
</template>
