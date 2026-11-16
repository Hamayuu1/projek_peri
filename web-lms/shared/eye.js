/* Tombol mata untuk menampilkan atau menyembunyikan kata sandi. Dipakai admin dan peserta. */
document.addEventListener('click', function (e) {
  var b = e.target.closest ? e.target.closest('.eye') : null;
  if (!b) return;
  e.preventDefault();
  var i = b.parentNode.querySelector('input');
  if (!i) return;
  var show = i.type === 'password';
  i.type = show ? 'text' : 'password';
  b.classList.toggle('show', show);
  b.setAttribute('aria-pressed', show ? 'true' : 'false');
  b.setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
  i.focus();
});