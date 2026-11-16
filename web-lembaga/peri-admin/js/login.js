/* Login khusus panel admin.
   Hanya akun ber-role 'admin' yang diterima server (/api/admin/login).
   Akun pendaftar mendapat pesan galat yang sama dengan sandi salah. */
(function () {
  "use strict";
  var API = "http://" + (location.hostname || "127.0.0.1") + ":5001";
  var form = document.getElementById("form-login");
  var pesan = document.getElementById("pesan");
  var tombol = document.getElementById("tombol");

  // Sudah login sebagai admin -> langsung ke dashboard.
  fetch(API + "/api/admin/cek", { credentials: "include" })
    .then(function (r) {
      if (r.ok) location.replace("dashboard.html");
    })
    .catch(function () {});

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = form.email.value.trim();
    var sandi = form.sandi.value;
    if (!email || !sandi) {
      pesan.textContent = "Masukkan email dan kata sandi.";
      return;
    }
    pesan.textContent = "";
    tombol.disabled = true;
    fetch(API + "/api/admin/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: sandi }),
    })
      .then(function (res) {
        return res.json().then(function (d) {
          return { ok: res.ok, d: d };
        });
      })
      .then(function (r) {
        if (r.ok) return location.replace("dashboard.html");
        pesan.textContent = (r.d && (r.d.error || r.d.message)) || "Email atau kata sandi salah.";
      })
      .catch(function () {
        pesan.textContent = "Server tidak dapat dihubungi. Pastikan backend sudah berjalan.";
      })
      .then(function () {
        tombol.disabled = false;
      });
  });
})();