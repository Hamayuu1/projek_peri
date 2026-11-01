/* =========================================================
   PERI — Wizard "Temukan Program Anda" (3 langkah + hasil)
   Dibuka oleh tombol [data-temukan-program] di halaman Program.
   Rekomendasi dihitung di browser dengan aturan skor sederhana
   (tabel di bawah), dari daftar program yang ada di halaman.
   Desain: Figma node 166:371 (Profil), 167:263 (Preferensi), 168:536 (Tujuan).
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Pilihan formulir ---------- */
  var KERJA = [
    "Pelajar/Mahasiswa",
    "Ibu rumah tangga",
    "Karyawan",
    "Wirausaha",
    "Belum bekerja",
    "Lainnya",
  ];
  var EKONOMI = ["Kurang mampu", "Menengah", "Mapan"];
  var TOPIK = [
    "Pemulihan diri dan kesehatan mental",
    "Literasi dan advokasi",
    "Bisnis dan Kewirausahaan",
    "Pemasaran digital dan desain",
    "Jejaring dan kolaborasi",
    "Kesehatan, parenting dan reproduksi",
    "Pendidikan anak perempuan",
    "Keuangan dan permodalan usaha",
    "Kegiatan sosial dan lingkungan",
    "Karya kreatif dan lingkungan",
  ];
  var TUJUAN = [
    "Memulihkan diri dan menjaga kesehatan",
    "Mencapai kemandirian ekonomi",
    "Menambah keterampilan",
    "Memperluas jejaring",
    "Mendapat akses permodalan",
    "Bantuan pendidikan untuk anak",
    "Mempromosikan hasil karya",
  ];

  /* ---------- Tabel skor: pilihan -> {program: bobot} ---------- */
  var BANGKIT = "Bangkit dan Berdaya";
  var INKUBATOR = "Inkubator Bisnis Perempuan";
  var KREASI = "Kelas Kreasi Mandiri";
  var DIGITAL = "Digital Skill Academy";
  var RUANG = "Ruang Temu & Kolaborasi";
  var SEHAT = "Perempuan Sehat & Bahagia";
  var BEASISWA = "Beasiswa Kreatifitas Anak Perempuan";
  var PODCAST = "Podcast Suara Perempuan";
  var FESTIVAL = "Festival Perempuan Kreatif";
  var GERAKAN = "Gerakan Sosial & Lingkungan";

  function w() {
    var o = {};
    for (var i = 0; i < arguments.length; i += 2)
      o[arguments[i]] = arguments[i + 1];
    return o;
  }

  var SKOR_TOPIK = {
    "Pemulihan diri dan kesehatan mental": w(BANGKIT, 3, SEHAT, 1),
    "Literasi dan advokasi": w(PODCAST, 3, GERAKAN, 2),
    "Bisnis dan Kewirausahaan": w(INKUBATOR, 3, KREASI, 1),
    "Pemasaran digital dan desain": w(DIGITAL, 3, FESTIVAL, 1),
    "Jejaring dan kolaborasi": w(RUANG, 3, FESTIVAL, 1),
    "Kesehatan, parenting dan reproduksi": w(SEHAT, 3, BANGKIT, 1),
    "Pendidikan anak perempuan": w(BEASISWA, 3),
    "Keuangan dan permodalan usaha": w(KREASI, 3, INKUBATOR, 1),
    "Kegiatan sosial dan lingkungan": w(GERAKAN, 3, RUANG, 1),
    "Karya kreatif dan lingkungan": w(FESTIVAL, 2, GERAKAN, 2),
  };
  var SKOR_TUJUAN = {
    "Memulihkan diri dan menjaga kesehatan": w(BANGKIT, 2, SEHAT, 2),
    "Mencapai kemandirian ekonomi": w(INKUBATOR, 2, KREASI, 2),
    "Menambah keterampilan": w(DIGITAL, 2, INKUBATOR, 1),
    "Memperluas jejaring": w(RUANG, 2, FESTIVAL, 1),
    "Mendapat akses permodalan": w(KREASI, 2, INKUBATOR, 1),
    "Bantuan pendidikan untuk anak": w(BEASISWA, 3),
    "Mempromosikan hasil karya": w(FESTIVAL, 2, DIGITAL, 1),
  };
  var SKOR_KERJA = {
    "Pelajar/Mahasiswa": w(DIGITAL, 1, BEASISWA, 1),
    "Ibu rumah tangga": w(SEHAT, 1, KREASI, 1, RUANG, 1),
    Karyawan: w(DIGITAL, 1, RUANG, 1),
    Wirausaha: w(INKUBATOR, 1, DIGITAL, 1, FESTIVAL, 1),
    "Belum bekerja": w(DIGITAL, 1, INKUBATOR, 1),
    Lainnya: {},
  };
  var SKOR_EKONOMI = {
    "Kurang mampu": w(KREASI, 1, BEASISWA, 1, BANGKIT, 1),
    Menengah: {},
    Mapan: w(GERAKAN, 1, RUANG, 1),
  };

  /* ---------- Util ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function katalog() {
    return Array.prototype.map.call(
      document.querySelectorAll(".program-card-full[data-nama]"),
      function (card) {
        var img = card.querySelector("img");
        return {
          nama: card.getAttribute("data-nama"),
          kategori: card.getAttribute("data-kategori") || "",
          gambar: img ? img.getAttribute("src") : "",
          deskripsi: (
            (card.querySelector(".pc-body p") || {}).textContent || ""
          )
            .replace(/\s+/g, " ")
            .trim(),
        };
      },
    );
  }
  var NAMA_KATEGORI = {
    kesehatan: "Kesehatan",
    bisnis: "Bisnis",
    pelatihan: "Pelatihan",
    komunitas: "Komunitas",
  };

  /* ---------- Perhitungan rekomendasi ---------- */
  function hitung(s) {
    var skor = {};
    var alasan = {};
    var penyebut = 0; // skor tertinggi yang mungkin untuk jawaban ini (satu program cocok penuh = 100%)
    function maks(bobot) {
      var m = 0;
      Object.keys(bobot || {}).forEach(function (k) {
        if (bobot[k] > m) m = bobot[k];
      });
      return m;
    }
    function tambah(peta, kunci, jenis) {
      var bobot = peta[kunci] || {};
      penyebut += maks(bobot);
      Object.keys(bobot).forEach(function (prog) {
        skor[prog] = (skor[prog] || 0) + bobot[prog];
        alasan[prog] = alasan[prog] || { topik: [], tujuan: [], profil: false };
        if (jenis === "profil") alasan[prog].profil = true;
        else alasan[prog][jenis].push(kunci);
      });
    }
    s.topik.forEach(function (t) {
      tambah(SKOR_TOPIK, t, "topik");
    });
    s.tujuan.forEach(function (t) {
      tambah(SKOR_TUJUAN, t, "tujuan");
    });
    tambah(SKOR_KERJA, s.kerja, "profil");
    tambah(SKOR_EKONOMI, s.ekonomi, "profil");
    var usia = Number(s.usia);
    var bobotUsia =
      usia < 18
        ? w(BEASISWA, 2, DIGITAL, 1)
        : usia >= 60
          ? w(RUANG, 1, SEHAT, 1)
          : {};
    penyebut += maks(bobotUsia);
    Object.keys(bobotUsia).forEach(function (prog) {
      skor[prog] = (skor[prog] || 0) + bobotUsia[prog];
      (alasan[prog] = alasan[prog] || {
        topik: [],
        tujuan: [],
        profil: false,
      }).profil = true;
    });

    var urut = katalog()
      .map(function (p, i) {
        var sk = skor[p.nama] || 0;
        return {
          p: p,
          skor: sk,
          i: i,
          alasan: alasan[p.nama],
          persen: penyebut
            ? Math.max(1, Math.min(100, Math.round((sk / penyebut) * 100)))
            : 0,
        };
      })
      .filter(function (x) {
        return x.skor > 0;
      })
      .sort(function (a, b) {
        return b.skor - a.skor || a.i - b.i;
      });
    return urut.slice(0, 4); // 1 utama + hingga 3 program lain
  }

  /* ---------- Tampilan ---------- */
  var overlay, page, lastFocus;
  var state;

  function reset() {
    state = {
      step: 1,
      usia: "",
      kerja: "",
      ekonomi: "",
      topik: [],
      tujuan: [],
    };
  }

  function dibangun() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "tp-overlay";
    overlay.hidden = true;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "tp-title");
    page = document.createElement("div");
    page.className = "tp-page";
    overlay.appendChild(page);
    document.body.appendChild(overlay);

    page.addEventListener("click", function (e) {
      var opsi = e.target.closest("[data-opsi]");
      if (opsi) return pilih(opsi);
      var aksi = e.target.closest("[data-aksi]");
      if (!aksi) return;
      var a = aksi.getAttribute("data-aksi");
      if (a === "batal") tutup();
      else if (a === "kembali") {
        simpanUsia();
        state.step -= 1;
        render();
      } else if (a === "lanjut") lanjut();
      else if (a === "ulang") {
        reset();
        render();
      } else if (a === "semua") {
        tutup();
        var grid = document.getElementById("program-grid");
        if (grid) grid.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    page.addEventListener("input", function (e) {
      if (e.target.id === "tp-usia") {
        state.usia = e.target.value;
        e.target.closest(".tp-group").classList.remove("has-error");
      }
    });
    // Fase capture: catat dulu apakah ada pop-up lain terbuka, sebelum skripnya menutup diri.
    var popupTerbuka = false;
    document.addEventListener(
      "keydown",
      function (e) {
        if (e.key !== "Escape") return;
        popupTerbuka = !!document.querySelector(
          ".dp-overlay:not([hidden]), .auth-overlay:not([hidden])",
        );
      },
      true,
    );
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || overlay.hidden || popupTerbuka) return;
      tutup();
    });
  }

  function buka() {
    dibangun();
    reset();
    lastFocus = document.activeElement;
    var header = document.querySelector(".site-header");
    overlay.style.top =
      (header ? Math.round(header.getBoundingClientRect().bottom) : 93) + "px";
    render();
    overlay.hidden = false;
    document.body.classList.add("tp-open");
    overlay.scrollTop = 0;
  }
  function tutup() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove("tp-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function simpanUsia() {
    var el = document.getElementById("tp-usia");
    if (el) state.usia = el.value;
  }

  function penanda(aktif) {
    var nama = ["Profil", "Preferensi", "Tujuan"];
    return (
      '<ol class="tp-steps" aria-label="Langkah">' +
      nama
        .map(function (n, i) {
          var no = i + 1;
          var kelas = no === aktif ? "active" : no < aktif ? "done" : "";
          return (
            '<li class="' +
            kelas +
            '"' +
            (no === aktif ? ' aria-current="step"' : "") +
            '><span class="tp-num">' +
            no +
            '</span><span class="tp-label">' +
            n +
            "</span></li>"
          );
        })
        .join("") +
      "</ol>"
    );
  }

  function opsiHtml(daftar, terpilih, jenis, multi) {
    return (
      '<div class="tp-options" role="' +
      (multi ? "group" : "radiogroup") +
      '">' +
      daftar
        .map(function (t) {
          var on = multi ? terpilih.indexOf(t) !== -1 : terpilih === t;
          return (
            '<button type="button" class="tp-option" data-opsi="' +
            jenis +
            '" data-nilai="' +
            esc(t) +
            '" ' +
            (multi ? 'aria-pressed="' : 'role="radio" aria-checked="') +
            (on ? "true" : "false") +
            '">' +
            esc(t) +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function grup(id, label, isi, bantuan) {
    return (
      '<div class="tp-group" data-grup="' +
      id +
      '"><span class="tp-label">' +
      esc(label) +
      "</span>" +
      (bantuan ? '<p class="tp-help">' + esc(bantuan) + "</p>" : "") +
      isi +
      '<p class="tp-error" role="alert"></p></div>'
    );
  }

  function render() {
    var s = state;
    var html =
      '<h2 class="tp-title" id="tp-title">' +
      (s.step === 4
        ? "Hasil Rekomendasi Program"
        : "Temukan Program Yang Tepat Untuk Anda") +
      "</h2>";
    page.className = "tp-page" + (s.step === 4 ? " wide" : "");
    if (s.step === 4) {
      html += hasilHtml();
      page.innerHTML = html;
      var tombol = page.querySelector(
        ".tp-main .tp-btn.primary, .tp-btn.primary",
      );
      if (tombol) tombol.focus();
      return;
    }
    html += penanda(s.step) + '<div class="tp-card">';
    if (s.step === 1) {
      html +=
        '<div class="tp-group" data-grup="usia"><label class="tp-label" for="tp-usia">Usia</label>' +
        '<input class="tp-input" id="tp-usia" type="number" inputmode="numeric" min="5" max="100" placeholder="Contoh: 25" value="' +
        esc(s.usia) +
        '" />' +
        '<p class="tp-error" role="alert"></p></div>' +
        grup(
          "kerja",
          "Status Pekerjaan",
          opsiHtml(KERJA, s.kerja, "kerja", false),
        ) +
        grup(
          "ekonomi",
          "Kondisi Ekonomi",
          opsiHtml(EKONOMI, s.ekonomi, "ekonomi", false),
        );
    } else if (s.step === 2) {
      html += grup(
        "topik",
        "Topik apa yang ingin anda pelajari?",
        opsiHtml(TOPIK, s.topik, "topik", true),
        "Pilih satu atau lebih.",
      );
    } else {
      html += grup(
        "tujuan",
        "Apa tujuan anda mengikuti program?",
        opsiHtml(TUJUAN, s.tujuan, "tujuan", true),
        "Pilih satu atau lebih.",
      );
    }
    html +=
      '<div class="tp-actions">' +
      '<button type="button" class="tp-btn" data-aksi="' +
      (s.step === 1 ? "batal" : "kembali") +
      '">' +
      (s.step === 1 ? "Batal" : "Kembali") +
      "</button>" +
      '<button type="button" class="tp-btn primary" data-aksi="lanjut">' +
      (s.step === 3 ? "Analisis Profil Saya" : "Lanjut") +
      "</button></div></div>";
    page.innerHTML = html;
    var pertama = page.querySelector("#tp-usia, .tp-option");
    if (pertama) pertama.focus({ preventScroll: true });
  }

  function pilih(btn) {
    var jenis = btn.getAttribute("data-opsi");
    var nilai = btn.getAttribute("data-nilai");
    if (jenis === "kerja" || jenis === "ekonomi") {
      state[jenis] = nilai;
      btn.parentNode.querySelectorAll(".tp-option").forEach(function (b) {
        b.setAttribute("aria-checked", b === btn ? "true" : "false");
      });
    } else {
      var i = state[jenis].indexOf(nilai);
      if (i === -1) state[jenis].push(nilai);
      else state[jenis].splice(i, 1);
      btn.setAttribute("aria-pressed", i === -1 ? "true" : "false");
    }
    var g = btn.closest(".tp-group");
    if (g) g.classList.remove("has-error");
  }

  function galat(id, pesan) {
    var g = page.querySelector('[data-grup="' + id + '"]');
    if (!g) return;
    g.classList.add("has-error");
    g.querySelector(".tp-error").textContent = pesan;
  }

  function lanjut() {
    var s = state;
    var ok = true;
    page.querySelectorAll(".has-error").forEach(function (g) {
      g.classList.remove("has-error");
    });
    if (s.step === 1) {
      simpanUsia();
      var u = Number(s.usia);
      if (!s.usia || !isFinite(u) || u < 5 || u > 100 || Math.floor(u) !== u) {
        galat("usia", "Masukkan usia dalam angka (5–100).");
        ok = false;
      }
      if (!s.kerja) {
        galat("kerja", "Pilih status pekerjaan Anda.");
        ok = false;
      }
      if (!s.ekonomi) {
        galat("ekonomi", "Pilih kondisi ekonomi Anda.");
        ok = false;
      }
    } else if (s.step === 2 && !s.topik.length) {
      galat("topik", "Pilih minimal satu topik.");
      ok = false;
    } else if (s.step === 3 && !s.tujuan.length) {
      galat("tujuan", "Pilih minimal satu tujuan.");
      ok = false;
    }
    if (!ok) {
      var salah = page.querySelector(".has-error");
      if (salah && salah.scrollIntoView)
        salah.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    s.step += 1;
    render();
    overlay.scrollTop = 0;
  }

  function daftarKata(arr) {
    if (arr.length < 2) return arr.join("");
    return arr.slice(0, -1).join(", ") + " dan " + arr[arr.length - 1];
  }
  var CEK =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function hasilHtml() {
    var hasil = hitung(state);
    if (!hasil.length) {
      return (
        '<div class="tp-card"><p>Belum ada program yang cocok dengan pilihan Anda. Silakan lihat semua program.</p>' +
        '<div class="tp-actions"><button type="button" class="tp-btn" data-aksi="ulang">Ulangi</button>' +
        '<button type="button" class="tp-btn primary" data-aksi="semua">Lihat Semua Program</button></div></div>'
      );
    }
    var u = hasil[0];
    var a = u.alasan || { topik: [], tujuan: [], profil: false };
    var cek = [];
    if (a.topik.length) cek.push("Minat sesuai");
    if (a.tujuan.length) cek.push("Tujuan sesuai");
    if (a.profil) cek.push("Status peserta sesuai");
    if (a.topik.length && a.tujuan.length)
      cek.push("Karakteristik program sesuai");
    var alasan = [];
    if (a.topik.length)
      alasan.push(
        "minat Anda pada " +
          daftarKata(a.topik).toLowerCase() +
          " sesuai dengan fokus program",
      );
    if (a.tujuan.length)
      alasan.push(
        "tujuan Anda untuk " +
          daftarKata(a.tujuan).toLowerCase() +
          " sejalan dengan program ini",
      );
    if (a.profil)
      alasan.push(
        "status Anda (" +
          state.kerja.toLowerCase() +
          ") termasuk sasaran program",
      );
    var html =
      '<p class="tp-eyebrow2">Program yang paling sesuai dengan profil Anda</p>' +
      '<section class="tp-main"><div class="tp-main-top"><div class="tp-main-text">' +
      '<span class="tp-eyebrow">Rekomendasi Utama</span><h3>' +
      esc(u.p.nama) +
      "</h3><p>Program ini direkomendasikan karena memiliki karakteristik yang sesuai dengan profil dan tujuan Anda.</p></div>" +
      (u.p.gambar
        ? '<img src="' + esc(u.p.gambar) + '" alt="' + esc(u.p.nama) + '" />'
        : "") +
      '</div><div class="tp-why"><h4>Mengapa program ini direkomendasikan?</h4><ul class="tp-checks">' +
      cek
        .map(function (t) {
          return "<li>" + CEK + esc(t) + "</li>";
        })
        .join("") +
      '</ul><div class="tp-score"><b>' +
      u.persen +
      "%</b><span>Tingkat Kesesuaian</span></div>" +
      (alasan.length
        ? '<p class="tp-reason">Program ini cocok karena ' +
          esc(alasan.join(", ")) +
          ".</p>"
        : "") +
      '</div><div class="tp-main-act"><button type="button" class="tp-btn primary" data-daftar-program data-daftar-nama="' +
      esc(u.p.nama) +
      '">Daftar Sekarang</button></div></section>';
    var lain = hasil.slice(1);
    if (lain.length) {
      html +=
        '<h3 class="tp-other-title">Program Lain Yang Mungkin Sesuai</h3><div class="tp-results">';
      lain.forEach(function (x) {
        var b = x.alasan || { topik: [], tujuan: [], profil: false };
        var r = [];
        if (b.topik.length)
          r.push(
            "minat pada " +
              daftarKata(b.topik).toLowerCase() +
              " sesuai dengan fokus program",
          );
        if (b.tujuan.length)
          r.push(
            "tujuan Anda untuk " +
              daftarKata(b.tujuan).toLowerCase() +
              " sejalan dengan program ini",
          );
        if (!r.length && b.profil)
          r.push("profil Anda termasuk sasaran program");
        html +=
          '<article class="tp-result">' +
          (x.p.gambar ? '<img src="' + esc(x.p.gambar) + '" alt="" />' : "") +
          '<div class="tp-body"><div class="tp-meta"><span class="tp-badge">' +
          esc(NAMA_KATEGORI[x.p.kategori] || "Program") +
          '</span><span class="tp-pct">' +
          x.persen +
          "% sesuai</span></div><h3>" +
          esc(x.p.nama) +
          "</h3><p>Program ini direkomendasikan karena " +
          esc(r.join(", ")) +
          '.</p><button type="button" class="tp-btn-red" data-daftar-program data-daftar-nama="' +
          esc(x.p.nama) +
          '">Daftar Program</button></div></article>';
      });
      html += "</div>";
    }
    html +=
      '<p class="tp-note">Persentase dihitung dari kecocokan jawaban Anda dengan tiap program. Ini hanya saran awal; tim PERI dapat membantu bila Anda masih ragu.</p>' +
      '<div class="tp-actions" style="justify-content:center">' +
      '<button type="button" class="tp-btn" data-aksi="ulang">Ulangi Analisis</button>' +
      '<button type="button" class="tp-btn primary" data-aksi="semua">Lihat Semua Program</button></div>';
    return html;
  }

  document.addEventListener("peri:lihat-program", tutup);

  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-temukan-program]");
    if (!t) return;
    e.preventDefault();
    buka();
  });
})();
