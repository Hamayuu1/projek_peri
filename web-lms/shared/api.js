/* Penghubung LMS ke database MySQL lewat API PHP (folder ../api/).
   - Saat halaman dibuka: data dimuat dari MySQL lalu ditaruh di localStorage (aplikasi tetap membaca dari sana).
   - Setiap penyimpanan aplikasi ke localStorage otomatis dikirim juga ke MySQL.
   - Kalau API tidak bisa dijangkau (mis. dibuka langsung dari file), aplikasi memakai localStorage seperti biasa.
   Buka lewat http://localhost/web-lms/... (Laragon), bukan lewat file:// atau server lain. */
(function () {
  'use strict';
  var S = window.Store; if (!S) return;
  var me = document.currentScript;
  var base = me && me.src ? me.src.replace(/shared\/api\.js.*$/, 'api/') : '../api/';
  var asli = Storage.prototype.setItem;
  var Api = { on: false, base: base, terakhir: 0 };

  function panggil(metode, path, body) {
    try {
      var x = new XMLHttpRequest();
      x.open(metode, base + path, false);
      if (body) x.setRequestHeader('Content-Type', 'application/json');
      x.send(body || null);
      if (x.status < 200 || x.status >= 300) return { ok: false, status: x.status, pesan: (function () { try { return JSON.parse(x.responseText).pesan; } catch (e) { return 'Server mengembalikan kode ' + x.status; } })() };
      return JSON.parse(x.responseText);
    } catch (e) { return null; }
  }
  function hariIni() {
    var d = new Date(), z = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  }
  function muat() {
    var d = panggil('GET', 'muat.php');
    if (d && d.status === 401) { Api.on = true; Api.terakhir = Date.now(); return false; } // API aktif, belum login
    if (!d || !d.programs) return false;
    try { asli.call(window.localStorage, S.KEY, JSON.stringify(d)); } catch (e) { return false; }
    Api.on = true; Api.terakhir = Date.now(); S.TODAY = hariIni();
    return true;
  }
  function peringatan(teks) {
    try {
      var b = document.getElementById('apiWarn');
      if (!b) {
        b = document.createElement('div'); b.id = 'apiWarn';
        b.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99999;background:#C8202A;color:#fff;padding:10px 16px;border-radius:10px;font:600 13px Poppins,sans-serif;max-width:90vw;text-align:center;box-shadow:0 4px 14px rgba(0,0,0,.25)';
        (document.body || document.documentElement).appendChild(b);
      }
      b.textContent = teks; b.style.display = 'block';
      clearTimeout(peringatan.t); peringatan.t = setTimeout(function () { b.style.display = 'none'; }, 6000);
    } catch (e) {}
  }

  Storage.prototype.setItem = function (k, v) {
    asli.call(this, k, v);
    if (Api.on && k === S.KEY && this === window.localStorage) {
      var r = panggil('POST', 'simpan.php', v);
      if (!r || !r.ok) peringatan('Perubahan belum tersimpan ke database' + (r && r.pesan ? ': ' + r.pesan : '. Pastikan MySQL Laragon berjalan.'));
    }
  };

  var loadAsli = S.load;
  S.load = function () {
    if (Api.on && Date.now() - Api.terakhir > 2000) muat();
    return loadAsli.call(S);
  };

  Api.login = function (email, pw, peran) {
    if (!Api.on) return undefined;
    var t = panggil('GET', 'token.php');
    if (!t || !t.csrf) return null;
    var r = panggil('POST', peran === 'admin' ? 'login.php' : 'login_lembaga.php', JSON.stringify({ email: email, pw: pw, csrf: t.csrf }));
    if (r && r.ok) { muat(); return r.id; } return null;
  };

  window.Api = Api;
  muat();
})();