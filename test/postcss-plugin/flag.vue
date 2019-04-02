<style>
.container {
  font-size: 2em;
}
@supports not (--flag: a) {
.noaaaa {
  font-size: '1px';
}
}
@supports (--flag: a) and (--flag: b) {
.aaaa_bbbb {
  font-size: '2px';
}
}
@supports (--flag: a) and (not(--flag: b)) {
.aaaa_nobbbb {
  font-size: '3px';
}
}
</style>

<!-- tests -->
<style flag="a: true, b: false">
.container {
  font-size: 2em;
}
.aaaa_nobbbb {
  font-size: '3px';
}
</style>

<style flag="a: false, b: true">
.container {
  font-size: 2em;
}
.noaaaa {
  font-size: '1px';
}
</style>

<style flag="a: true, b: true">
.container {
  font-size: 2em;
}
.aaaa_bbbb {
  font-size: '2px';
}
</style>
