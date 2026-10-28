/* Penjaga akses halaman admin.
   Hanya akun ber-role 'admin' yang boleh melihat halaman ini.
   Belum masuk / bukan admin / server auth mati -> dialihkan ke web lembaga.
   Dimuat di <head> sebelum konten tampil. */
(function () {
  "use strict";
  var API = "http://" + (location.hostname || "127.0.0.1") + ":5001";
  var LEMBAGA = "../peri-lembaga/beranda.html";

  var hide = document.createElement("style");
  hide.textContent = "html{visibility:hidden}";
  document.head.appendChild(hide);

  function tolak() {
    location.replace(LEMBAGA);
  }

  function pasangKeluar(user) {
    var avatar = document.querySelector(".topbar .avatar");
    if (!avatar) return;
    avatar.textContent = user.email.charAt(0).toUpperCase();
    avatar.title = user.email;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm";
    btn.textContent = "Keluar";
    btn.style.marginRight = "8px";
    btn.addEventListener("click", function () {
      fetch(API + "/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
        .catch(function () {})
        .then(tolak);
    });
    var wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;align-items:center";
    avatar.parentNode.insertBefore(wrap, avatar);
    wrap.appendChild(btn);
    wrap.appendChild(avatar);
  }

  // Server yang menentukan: /api/admin/cek hanya menjawab 200 untuk role admin.
  fetch(API + "/api/admin/cek", { credentials: "include" })
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(function (data) {
      if (!data || !data.user) return tolak();
      hide.remove();
      document.addEventListener("DOMContentLoaded", function () {
        pasangKeluar(data.user);
      });
      if (document.readyState !== "loading") pasangKeluar(data.user);
    })
    .catch(tolak);
})();
