<style>
.media-test {
  color: red;
}
@supports (--flag: a) {
  .foo-a {
    content: 'foo-a';
  }
  @media screen and (max-width: 1200px) {
    .foo {
      content: 'foo';
    }
    @supports (--flag: b) {
      .foo-b {
        content: 'foo-b';
      }
    }
  }
}
</style>

<style flag="a: true, b: false">
.media-test {
  color: red;
}
.foo-a {
    content: 'foo-a';
  }
@media screen and (max-width: 1200px) {
    .foo {
      content: 'foo';
    }
  }
</style>

<style flag="a: true, b: true">
.media-test {
  color: red;
}
.foo-a {
    content: 'foo-a';
  }
@media screen and (max-width: 1200px) {
    .foo {
      content: 'foo';
    }
      .foo-b {
        content: 'foo-b';
      }
  }
</style>
