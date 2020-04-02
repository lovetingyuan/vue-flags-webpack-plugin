<template>
  <div>
    <a-b v-if-flag="a">@a1#</a-b>
    <a-b v-elif-flag="b">@a0_b1#</a-b>
    <div>
      <c-d v-if-flag="c">
        @c1#
      </c-d>
      <p v-else-flag>@c0#</p>
    </div>
  </div>
</template>
