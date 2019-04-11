<template title="basic-test">
  <div v-once>
    <h1 name="">basic</h1>
    <div v-if-flag="a"> __a1-- </div>
    <hello-world></hello-world>
    <ul v-pre>
      <li v-if-flag="b">__b1--</li>
      <li v-else-flag>__b0--</li>
    </ul>
    <template></template>
    <span v-if-flag="c">__c1--</span>

    <!--foo-->
    <span v-elif-flag="a">__c0_a1--</span>  <!--bar-->
    <span v-elif-flag="b" v-pre>__c0_a0_b1--</span>
    <span v-else-flag>__c0_a0_b0--</span>

    <component v-if-flag="d" :is="helloworld">
      __d1--
      <transition-group tag="ul" name="__d1_e1--" v-if-flag="e">
        <li v-for="item in items" :key="item.id" v-if-flag="f">
          {{ item.text }} __d1_e1_f1--
        </li>
        <span v-else-flag title="__d1_e1_f0--"></span>
      </transition-group>
      <img v-elif-flag="a" src="__d1_e0_a1--">
    </component>
    <span v-else-flag>__d0--</span>

    <div>
      <div v-for="a in b" :key="a" v-if-flag="f">
        __f1-- {{a}}
      </div>
      <div v-for="c in d" :key="c" v-elif-flag="b">
        __f0_b1-- {{c}}
        <p v-if-flag="c">__f0_b1_c1--</p>
        <img v-else-flag src="__f0_b1_c0--">
      </div>
      <span v-else-flag>__f0_b0--</span>
    </div>
  </div>
</template>
