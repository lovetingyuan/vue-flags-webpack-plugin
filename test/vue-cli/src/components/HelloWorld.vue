<template>
  <div class="hello">
    <h1>{{ title }}</h1>
    <p v-if-flag="A">
      feature Aaa
    </p>
    <p v-elif-flag="B">
      feature B
    </p>
    <p v-else-flag>
      nononono
    </p>
    <h3>Installed CLI Plugins</h3>
    <ul>
      <li><a href="https://github.com/vuejs/vue-cli/tree/dev/packages/%40vue/cli-plugin-babel" target="_blank" rel="noopener">babel</a></li>
    </ul>
    <h3>Essential Links</h3>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  data() {
    return {
      title: this.msg + '-----' + (flags.A ? 'feature A' : 'not feature A')
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
@supports (--flag: A) {
  h1:after {
    content: ' featureA';
    color: green;
    font-size: .7em;
  }
}

@supports (--flag: B) {
  h1:after {
    content: ' featureB';
    color: red;
    font-size: .7em;
  }
}

h3 {
  margin: 40px 0 0;
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
