<template>
  <div>
    <h3>{{title}}</h3>
    <span v-if-flag="A">template:A_is_enable</span>
    <span v-elif-flag="B">template:B_is_enable</span>
    <span v-else-flag>template:A_B_is_disable</span>
    <a-comp></a-comp>
  </div>
</template>
<script>
import AComponent from './a-component.vue?flag'
export default {
  components: {
    'a-comp': AComponent
  },
  data() {
    return {
      title: flags.A ? 'template:title_is_A' : 'template:title_is_not_A'
    }
  }
}
</script>
<style>
@supports (--flag: A) {
  h3:before {
    content: 'style:A_is_enabled';
    color: green;
  }
}
@supports not (--flag: A) {
  h3:before {
    content: 'style:A_is_disabled';
    color: red;
  }
}
@supports not (--flag: B) {
  h3:before {
    content: 'style:B_is_disabled';
    color: red;
  }
}
</style>
