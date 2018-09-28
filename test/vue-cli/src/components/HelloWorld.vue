<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <p>
      <span v-if-flag="featureB">For guide and recipes,</span>
      <span v-elif-flag="featureA">Feature a is enabled, this is true</span>
      <a v-else-flag href="https://cli.vuejs.org" target="_blank" rel="noopener">vue-cli documentation</a>.
    </p>
    <h3>Essential Links</h3>
    <ul>
      <li><a href="https://vuejs.org" target="_blank" rel="noopener">Core Docs</a></li>
      <li><a href="https://forum.vuejs.org" target="_blank" rel="noopener">Forum</a></li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld, ' + (featureA ? 'featureA is enabled' : 'featureA is disabled'),
  props: {
    msg: String
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
h3 {
  margin: 40px 0 0;
}
@supports (--flag: featureB) {
  h3:before {
    content: 'featureB is enabled';
  }
}

@supports (--flag: featureA) and (not (--flag: featureB)) {
  h3:after {
    content: 'featureA: enabled, featureB: disabled';
  }
}

ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
