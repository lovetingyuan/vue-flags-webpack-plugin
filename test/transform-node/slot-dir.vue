<template>
<!--
  v-slot only could be used on template(on top level of component children) or component
  and can not be used on template and component together
-->
  <div>
    <span v-if-flag="a">@a1#</span>
    <span v-else-flag>@a0#</span>
    <hello v-if-flag="e">
      <template v-slot="b" v-if-flag="f"> @e1_f1# {{b}}
        <span v-if-flag="a">@e1_f1_a1#</span>
        <span v-else-flag>@e1_f1_a0#</span>
      </template>
      <template v-slot:footer v-if-flag="d">@e1_d1#</template>
      <template v-slot:header="a" v-if-flag="b">@e1_b1# {{a}}</template>
    </hello>
    <img v-if-flag="b" src="@b1#">
    <img v-elif-flag="d" src="@b0_d1#">
    <hello-2 v-slot="foo" v-if-flag="c"> @c1# {{foo}}
      <span v-if-flag="d">@c1_d1#</span>
      <span v-elif-flag="e">@c1_d0_e1#</span>
    </hello-2>
  </div>
</template>

