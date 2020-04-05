<template>
  <div>
    <div v-if-flag="a">@a1#
      <p v-if-flag="b">@a1_b1#</p>
      <p v-elif-flag="c">@a1_b0_c1#</p>
    </div>
    <p v-else-flag>@a0#</p>
    <div v-if-flag="b">@b1#
      <div v-if-flag="c">@b1_c1#</div>
      <div v-else-flag>@b1_c0#
        <p v-if-flag="d">@b1_c0_d1#</p>
        <p v-elif-flag="a">@b1_c0_d0_a1#</p>
        <p v-elif-flag="e">@b1_c0_d0_a0_e1#</p>
        <p v-else-flag>@b1_c0_d0_a0_e0#</p>
      </div>
    </div>
  </div>
</template>
