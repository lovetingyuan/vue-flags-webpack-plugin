<template>
  <div class="container">
    <h3>{{title}}</h3>
    <section v-if-flag="b">  template:bbbbbbbbbbbbbbbb  </section>
    <div v-else-flag> template:nobbbbbbbbbbbbbbbbbbbbbb   </div>
    <template></template>
  </div>
</template>
<script>
export default {
  data() {
    let title
    if (VueFlags.b) {
      title = 'script:bbbbbbbbbbbbbbbbbbbb'
    } else {
      title = 'script:nobbbbbbbbbbbbbbbbbbb'
    }
    return {   title  }
  }
}
</script>

<style scoped src="./app2.css">

</style>

