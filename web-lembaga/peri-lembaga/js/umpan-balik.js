/* =========================================================
   PERI — "Apa Kata Mereka" (halaman Umpan Balik)
   Kartu dibuat dari daftar di bawah. Isi daftar ini hanya umpan balik yang SUDAH
   ditinjau admin dan diizinkan tampil oleh penulisnya.

   PENTING: tiga entri di bawah adalah CONTOH TAMPILAN (contoh: true) dan di halaman
   diberi label "Contoh". Ganti dengan umpan balik asli, lalu hapus `contoh: true`.
   Bila daftar kosong, seluruh bagian "Apa Kata Mereka" disembunyikan.
   ========================================================= */
(function () {
  "use strict";

  var UMPAN_BALIK_DISETUJUI = [
    {
      nama: "Sari W.",
      program: "Peserta Inkubator Bisnis Perempuan",
      pesan:
        "Pendampingan dari tim PERI membuat saya lebih percaya diri membuka usaha kecil di rumah. Materinya mudah dipahami dan mentornya sabar.",
      bintang: 5,
      contoh: true,
    },
    {
      nama: "Dewi A.",
      program: "Peserta Digital Skill Academy",
      pesan:
        "Kelas desain dan pemasaran digitalnya membantu saya memotret dan memasarkan produk sendiri. Semoga ada lebih banyak sesi lanjutan.",
      bintang: 5,
      contoh: true,
    },
    {
      nama: "Rina M.",
      program: "Peserta Bangkit dan Berdaya",
      pesan:
        "Ruang ceritanya hangat dan aman. Saya merasa didengar, dan saran saya tentang jadwal kegiatan ternyata ditindaklanjuti.",
      bintang: 5,
      contoh: true,
    },
  ];

  var TAMPIL_AWAL = 3;
  var NS = "http://www.w3.org/2000/svg";

  function el(tag, kelas, teks) {
    var e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (teks != null) e.textContent = teks;
    return e;
  }

  function bintang(n) {
    var wrap = el("div", "ub-stars");
    wrap.setAttribute("role", "img");
    wrap.setAttribute("aria-label", "Penilaian " + n + " dari 5");
    for (var i = 0; i < 5; i++) {
      var svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "currentColor");
      svg.setAttribute("aria-hidden", "true");
      if (i >= n) svg.setAttribute("class", "off");
      var p = document.createElementNS(NS, "path");
      p.setAttribute(
        "d",
        "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
      );
      svg.appendChild(p);
      wrap.appendChild(svg);
    }
    return wrap;
  }

  function inisial(nama) {
    var kata = String(nama)
      .replace(/[^\p{L}\s]/gu, "")
      .trim()
      .split(/\s+/);
    return (
      (kata[0] || "?").charAt(0) + (kata[1] ? kata[1].charAt(0) : "")
    ).toUpperCase();
  }

  function kartu(d) {
    var c = el("article", "ub-testi-card");
    var atas = el("div", "ub-testi-top");
    atas.appendChild(bintang(Math.max(0, Math.min(5, Number(d.bintang) || 0))));
    if (d.contoh) atas.appendChild(el("span", "ub-sample", "Contoh"));
    c.appendChild(atas);
    c.appendChild(el("p", "ub-quote", d.pesan));
    var pen = el("div", "ub-author");
    pen.appendChild(el("div", "ub-avatar", inisial(d.nama)));
    var tx = el("div");
    tx.appendChild(el("b", null, d.nama));
    tx.appendChild(el("span", null, d.program));
    pen.appendChild(tx);
    c.appendChild(pen);
    return c;
  }

  function init() {
    var seksi = document.getElementById("apa-kata-mereka");
    var grid = document.getElementById("ub-testi-grid");
    var more = document.getElementById("ub-testi-more");
    var tombol = document.getElementById("ub-testi-toggle");
    if (!seksi || !grid) return;
    if (!UMPAN_BALIK_DISETUJUI.length) {
      seksi.hidden = true;
      return;
    }
    var semua = false;
    function gambar() {
      grid.textContent = "";
      UMPAN_BALIK_DISETUJUI.slice(0, semua ? undefined : TAMPIL_AWAL).forEach(
        function (d) {
          grid.appendChild(kartu(d));
        },
      );
      if (tombol) {
        tombol.textContent = semua
          ? "Tampilkan Lebih Sedikit"
          : "Lihat Semua Umpan Balik";
        tombol.setAttribute("aria-expanded", semua ? "true" : "false");
      }
    }
    if (more) more.hidden = UMPAN_BALIK_DISETUJUI.length <= TAMPIL_AWAL;
    if (tombol)
      tombol.addEventListener("click", function () {
        semua = !semua;
        gambar();
      });
    gambar();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
