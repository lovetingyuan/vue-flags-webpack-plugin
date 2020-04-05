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
    return {   title: VueFlags.b ? 'script:bbbbbbbbbbbbbbbbbbbb' : 'script:nobbbbbbbbbbbbbbbbbbb'  }
  }
}
</script>

<style scoped src="./app2.css">

</style>

