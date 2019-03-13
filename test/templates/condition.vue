<template>
  <section>
    <!-- test cases with v-if -->
    <h1>this is title</h1>
    <div v-if="foo">
      <h2>this is subtitle</h2>
      <div v-if-flag="foo_a"> _foo_a1-- </div>
      <br>
      <a-compoent />
      <span v-if-flag="foo_b"> _foo_b1-- </span><!-- comment -->

      <span v-elif-flag="foo_c"> _foo_b0_c1--</span>
      <img><keep-alive></keep-alive><slot></slot>
      <a v-if-flag="foo_a && foo_b">_foo_a1_b1--</a>
      <a v-else-flag>_foo_a0-b0--</a> this is end of if
    </div>
    <div v-else>
      <h2>this is subtitle</h2>
      <div v-if-flag="foo_c"> _foo_c1-- </div>
      <br>
      <a-compoent />
      <div>
        <span v-if-flag="!foo_b"> _foo_b0-- </span><!-- comment -->

        <span v-elif-flag="!foo_c"> _foo_b1_c0--</span>
      </div>
      <div v-if="foo">
        <template>foo</template>
        <span v-if-flag="foo_d">_foo_d1--</span>
        <span v-elif-flag="foo_a">_foo_d0_a1--</span>
        <span v-elif-flag="foo_b">_foo_d0_a0_b1--</span>
        <span v-else-flag>_foo_d0_a0_b0--</span>
      </div>
      <div v-else-if="test">
        <svg></svg>
        <span v-if-flag="!foo_c">_foo_c0--</span>
        <span v-elif-flag="foo_b">_foo_c1_b1--</span>
        <span v-elif-flag="foo_a">_foo_c1_b0_a1--</span>
      </div>
      <div v-else>
        <span v-if-flag="foo_b">_foo_b0--</span>
        <span v-elif-flag="foo_c">_foo_b0_c1--</span>
        <span v-elif-flag="foo_d">_foo_b0_c0_d1--</span>
      </div>
      <img><keep-alive></keep-alive><slot></slot>
      <a v-if-flag="foo_a || foo_c">_foo_a1-c1--</a>
      <a v-else-flag>_foo_a0_c0--</a>
    </div>
  </section>
</template>
