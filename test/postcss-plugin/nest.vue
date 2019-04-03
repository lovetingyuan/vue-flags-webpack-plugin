<style>
.foo {
  background: turquoise;
}
@supports (--flag: a) {
  .foo-a {
    content: 'fooa';
  }
  @supports (--flag: b) {
    .foo-a-b {
      content: 'foo-ab';
    }
    @supports (--flag: c) {
      .foo-a-b-c {
        content: 'foo-abc';
      }
    }
  }
  @supports (--flag: c) {
    .foo-a-c {
      color: red;
    }
  }
}
</style>

<style flag="a: true, b: false, c: false">
.foo {
  background: turquoise;
}
.foo-a {
    content: 'fooa';
  }
</style>

<style flag="a: true, b: false, c: true">
.foo {
  background: turquoise;
}
.foo-a {
    content: 'fooa';
  }
.foo-a-c {
      color: red;
    }
</style>

<style flag="a: false, b: true, c: true">
.foo {
  background: turquoise;
}
</style>

<style flag="a: true, b: true, c: false">
.foo {
  background: turquoise;
}
.foo-a {
    content: 'fooa';
  }
.foo-a-b {
      content: 'foo-ab';
    }
</style>
