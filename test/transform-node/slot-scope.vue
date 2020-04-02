<template title="slot-test">
  <div>
    <span v-if-flag="b">@b1#</span>
    <section v-elif-flag="c"> @b0_c1#
      <slot name="aaa" v-if-flag="f">@b0_c1_f1#</slot>
      <img v-else-flag src="@b0_c1_f0#">
      <span v-if-flag="e" slot-scope="ABC" slot="Boo">
        @b0_c1_e1# {{ABC}}
      </span>
      <div slot-scope="Bar" v-if-flag="d">{{Bar}} @b0_c1_d1#</div>
    </section>
    <div slot="foo" slot-scope="Foo" :title="Foo" v-if-flag="d">
      <span v-if-flag="a"> @d1_a1#</span>
      <p v-else-flag>@d1_a0#</p>
    </div>
    <hello>
      <template slot="foo" v-if-flag="e">
        <span v-if-flag="a">@e1_a1#</span>
        <span v-elif-flag="b">@e1_a0_b1#</span>
        <span v-else-flag>@e1_a0_b0#</span>
      </template>
      <template slot="bar" v-if-flag="b"> {{props}}
        <span v-if-flag="d">@b1_d1#</span>
        <span v-else-flag>@b1_d0#</span>
      </template>
      <slot v-else-flag slot="foot">
        <span v-if-flag="c">@b0_c1#</span>
        <span v-else-flag>@b0_c0#</span>
      </slot>
    </hello>
    <div slot="bar">
      <my-app>

        <slot name="foo" v-if-flag="b">
          <a v-if-flag="f">       @b1_f1#     </a>
          <img v-elif-flag="a" src="@b1_f0_a1#">
        </slot>
        <section v-elif-flag="a">@b0_a1#</section>
        <slot v-else-flag>@b0_a0#</slot>
      </my-app>

    </div>
  </div>
</template>

