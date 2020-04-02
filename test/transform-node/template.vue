<template>
  <div>
    <div v-if-flag="a">@a1#</div>
    <template v-elif-flag="b">
      @a0_b1#
      <div v-if-flag="c">
        @a0_b1_c1#
      </div>
      <span v-else-flag>#a0_b1_c0#</span>
    </template>
    <template v-elif-flag="d">
      @a0_b0_d1#
    </template>
    <div v-else-flag>@a0_b0_d0#
      <template v-if-flag="e">
        @a0_b0_d0_e1#
      </template>
    </div>
  </div>
</template>
