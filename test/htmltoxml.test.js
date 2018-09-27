const xml2 = require('../lib/html-to-xml');
const test = require('tape');

const template = `
<div>
  <img>
  <img    src
  = "s<a>
  </a>df"
  >
  <span>this is text</span><![CDATA[cdata]]>
  <img src='sdfkd' alt=sdssd />
  <my-comp title="sd" />
  <p>this is para</p>
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
  <title>end</title>
</div>
`

test('html-to-xml', function(t) {
  t.equal(xml2(template), `
<div>
  <img/>
  <img src="s<a>
  </a>df"/>
  <span>this is text</span>
  <img src="sdfkd" alt="sdssd"/>
  <my-comp title="sd"/>
  <p>this is para</p>
  <!-- this is <b>comment</b> -->
  <my-co>this is my-co</my-co>
  <style>pp <sdf>p </style>
  <math display="block">
    <mrow>
      <mmultiscripts>
        <mi>F</mi>
        <mn>3</mn> <none/>
        <mprescripts/>
        <mn>2</mn><none/>
      </mmultiscripts>
    </mrow>
  </math>
  <hr/>
  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" baseProfile="full">
    <g fill-opacity="0.7" stroke="black" stroke-width="0.1cm">
      <circle cx="6cm" cy="2cm" r="100" fill="red" transform="translate(0,50)"/>
    </g>
  </svg>
  <title>end</title>
</div>
`);
  t.end();
});

