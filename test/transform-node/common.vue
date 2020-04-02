<template>
  <div>
    <p v-if-flag="a">@a1#</p>
    <p v-else-flag>@a0#</p>
    <p></p>

    <p v-if-flag="b">@b1#</p>

    <p v-if-flag="c">@c1#</p>
    <p v-elif-flag="b">@c0_b1#</p>
    <p v-else-flag>@c0_b0#</p>

    <div>
      <p v-if-flag="d">@d1#</p>
      <p v-elif-flag="a">@d0_a1#</p>
      <p v-elif-flag="b">@d0_a0_b1#</p>
      <p v-elif-flag="c">@d0_a0_b0_c1#</p>
      <p v-else-flag>@d0_a0_b0_c0#</p>
      <div>
        <p v-if-flag="e">@e1#</p>
        <p v-elif-flag="a">@e0_a1#</p>
        <p v-elif-flag="b">@e0_a0_b1#</p>
      </div>
    </div>
    <m-a v-if="foo">
      <span v-if-flag="c">@c1#</span><a v-else-flag href="@c0#"></a>
      <template slot="aa" slot-scope="a" v-if-flag="a">@a1#</template>
      <template slot slot-scope="b" v-if-flag="b">@b1#</template>
    </m-a>
    <t-a v-else>
      <span v-if-flag="d">@d1#</span>
      <p v-else-flag>@d0#</p>
      <section v-if-flag="d">
        <input :type="dynamic" v-if-flag="e" value="@d1_e1#">
        <input :type="dynamic" v-elif-flag="c" value="@d1_e0_c1#">
      </section>
    </t-a>
  </div>
</template>
