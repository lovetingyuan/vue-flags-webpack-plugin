const xml2 = require('../lib/htmlparser')
const test = require('tape')
const domserializer = require('dom-serializer')
const main = template => domserializer(xml2(template))

const template = `
<div>
  <img v-if="sdf">
  <img    src
  = "s<a>&&'''
  </a>df"
  >
  <span v-if-flag="true">this is text</span><![CDATA[cdata]]>
  <img src='sdfkd' alt=sdssd />
  <my-comp title="sd" v-pre />
  <p v-pre>this is para
    <a href=""></a>
  </p>
  <!-- this is <b>comment</b> -->
  <my-co>this is my-co</my-co>
  <style>pp <sdf>p </style>
  <math display="block">
    <mrow>
      <mmultiscripts>
        <mi>F</mi>
        <mn>3</mn> <none />
        <mprescripts/>
        <mn>2</mn><none/>
      </mmultiscripts>
    </mrow>
  </math>
  <hr>
  <svg xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      version="1.1"
      baseProfile="full">
    <g fill-opacity="0.7" stroke="black" stroke-width="0.1cm">
      <circle cx="6cm" cy="2cm" r="100" fill="red"
                      transform="translate(0,50)" />
    </g>
  </svg>
  <title :ff="ff" @click="onclick('sd' > '/', aa)">end</title>
</div>
`

test('html-to-xml', function (t) {
  t.equal(main(template.trim()), `
<div>
  <img v-if="sdf">
  <img src="s<a>&&'''
  </a>df">
  <span v-if-flag="true">this is text</span>
  <img src="sdfkd" alt="sdssd">
  <my-comp title="sd" v-pre=""></my-comp>
  <p v-pre="">this is para
    <a href=""></a>
  </p>
  <!-- this is <b>comment</b> -->
  <my-co>this is my-co</my-co>
  <style>pp <sdf>p </style>
  <math display="block">
    <mrow>
      <mmultiscripts>
        <mi>F</mi>
        <mn>3</mn> <none></none>
        <mprescripts></mprescripts>
        <mn>2</mn><none></none>
      </mmultiscripts>
    </mrow>
  </math>
  <hr>
  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" baseProfile="full">
    <g fill-opacity="0.7" stroke="black" stroke-width="0.1cm">
      <circle cx="6cm" cy="2cm" r="100" fill="red" transform="translate(0,50)"/>
    </g>
  </svg>
  <title :ff="ff" @click="onclick('sd' > '/', aa)">end</title>
</div>
`.trim())
  t.end()
})
