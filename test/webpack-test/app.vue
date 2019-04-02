<template>
  <div class="container">
    <h3>{{title}}</h3>
    <section v-if-flag="a">  template:aaaaaaaaaaaaaaaaa  </section>
    <div v-else-flag> template:noaaaaaaaaaaaaaaaaaaaa  </div>
    <my-app></my-app>
  </div>
</template>
<script>
import app2 from './app2.vue'
import add from './add';
export default {
  components: {
    myApp: app2
  },
  data() {
    let title
    if (VueFlags.a) {
      title = 'script:aaaaaaaaaaaaaaaaaaaaa'
    } else {
      title = 'script:noaaaaaaaaaaaaaaaaaaa'
    }
    return {  title }
  },
  mounted() {
    console.log(add);
  }
}
</script>

<style scoped>
.container {
  background-color: red;
}

@supports (--flag: a) {
  h3:before {
    content: 'style:aaaaaaaaaaaaaaaaa';
  }
}

@supports not (--flag: a) {
  h3:after {
    content: 'style:noaaaaaaaaaaaaaaaa';
  }
}
</style>

