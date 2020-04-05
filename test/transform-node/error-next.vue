<template error="v-else-flag must be next to v-if-flag">
  <div>
    <div v-if-flag="a">@a1#</div>
    <div></div>
    <div v-else-flag>@a0#</div>
  </div>
</template>
