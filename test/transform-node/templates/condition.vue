<template>
  <section>
    <!-- test cases with v-if -->
    <h1>this is title</h1>
    <div v-if="foo">
      <h2>this is subtitle</h2>
      <div v-if-flag="a"> __a1-- </div>
      <br>
      <a-compoent />
      <span v-if-flag="b"> __b1-- </span><!-- comment -->

      <span v-elif-flag="c"> __b0_c1--</span>
      <img><keep-alive></keep-alive><slot></slot>
      <a v-if-flag="a && b">__a1_b1--</a>
      <a v-else-flag>__a0-b0--</a> this is end of if
    </div>
    <div v-else>
      <h2>this is subtitle</h2>
      <div v-if-flag="c"> __c1-- </div>
      <br>
      <a-compoent />
      <div>
        <span v-if-flag="!b"> __b0-- </span><!-- comment -->

        <span v-elif-flag="!c"> __b1_c0--</span>
      </div>
      <div v-if="foo">
        <template>foo</template>
        <span v-if-flag="d">__d1--</span>
        <span v-elif-flag="a">__d0_a1--</span>
        <span v-elif-flag="b">__d0_a0_b1--</span>
        <span v-else-flag>__d0_a0_b0--</span>
      </div>
      <div v-else-if="test">
        <svg></svg>
        <span v-if-flag="!c">__c0--</span>
        <span v-elif-flag="b">__c1_b1--</span>
        <span v-elif-flag="a">__c1_b0_a1--</span>
      </div>
      <div v-else>
        <span v-if-flag="b">__b0--</span>
        <span v-elif-flag="c">__b0_c1--</span>
        <span v-elif-flag="d">__b0_c0_d1--</span>
      </div>
      <img><keep-alive></keep-alive><slot></slot>
      <a v-if-flag="a || c">__a1-c1--</a>
      <a v-else-flag>__a0_c0--</a>
    </div>
  </section>
</template>
