/* =========================================================
   PERI — Animasi & transisi visual (lapisan tambahan)
   1. Entrance (fade + slide-up ease-out) untuk elemen utama di layar pertama
   2. Transisi antar-halaman (native View Transitions; fallback fade bila tak didukung)
   3. Smooth scroll -> css/animations.css
   4. Scroll-triggered reveal (IntersectionObserver)
   Tidak mengubah DOM selain menambah/menghapus kelas `reveal`, `is-visible`.
   Bila JS dimatikan / browser lama, semua konten tampil normal (progressive enhancement).
   ========================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  var kurangiGerak =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dukungVT =
    "CSSViewTransition" in window ||
    (window.CSS && CSS.supports && CSS.supports("selector(::view-transition)"));
  var bisaObserve = "IntersectionObserver" in window;

  if (!dukungVT) root.classList.add("no-vt");
  if (!bisaObserve) return; // tanpa observer: biarkan semua tampil normal

  root.classList.add("anim-ready");

  /* ---------- Target animasi ---------- */
  var ITEM =
    ".page-banner-content,.about-hero-content,.beranda-hero-content," +
    ".impact-card,.kemitraan-card,.mini-program-card,.stat-block,.doc-card," +
    ".contact-info-card,.feedback-form-card,.ub-collab-card,.ub-testi-card," +
    ".program-card-full,.testimoni-card,.latar-card,.misi-item,.org-card,.quote-card," +
    ".langkah-box,.social-row-inner,.ub-banner,.join-banner,.collab-banner,.kolaborasi-cta," +
    ".tp-featured,.search-bar,.partner-marquee," +
    ".br-head,.br-about-row,.br-vm-card,.br-stat,.br-program-card,.br-step,.br-photo-card,.br-action";
  var TITIK_BASAH = ".container > *"; // cadangan bila bagian tak punya kartu

  function kumpulkan() {
    var hasil = [];
    document
      .querySelectorAll("main > section, main > div")
      .forEach(function (sec) {
        var daftar = Array.prototype.slice.call(sec.querySelectorAll(ITEM));
        if (!daftar.length)
          daftar = Array.prototype.slice.call(
            sec.querySelectorAll(TITIK_BASAH),
          );
        // buang elemen yang berada di dalam kandidat lain (hindari animasi ganda)
        daftar = daftar.filter(function (el) {
          return !daftar.some(function (o) {
            return o !== el && o.contains(el);
          });
        });
        // judul bagian (di luar kartu) ikut muncul
        var kepala = sec.querySelectorAll(
          ".container > .eyebrow-strong,.container > h2,.container > .ub-head,.container > .section-head",
        );
        Array.prototype.forEach.call(kepala, function (k) {
          if (
            daftar.indexOf(k) === -1 &&
            !daftar.some(function (o) {
              return o.contains(k);
            })
          )
            daftar.unshift(k);
        });
        hasil.push.apply(hasil, daftar);
      });
    return hasil;
  }

  function selesai(e) {
    var el = e.currentTarget;
    if (e.target !== el) return;
    el.classList.remove("reveal", "is-visible");
    el.style.removeProperty("--reveal-delay");
    el.removeEventListener("animationend", selesai);
  }

  function tampilkan(el, urutan) {
    el.style.setProperty(
      "--reveal-delay",
      0.1 + Math.min(urutan, 5) * 0.1 + "s",
    );
    el.addEventListener("animationend", selesai);
    el.classList.add("is-visible");
  }

  function init() {
    if (kurangiGerak) return;
    var target = kumpulkan();
    if (!target.length) return;
    var tinggi = window.innerHeight || root.clientHeight;
    var awal = []; // sudah terlihat saat halaman dimuat -> entrance
    var lain = [];

    var lebar = window.innerWidth || root.clientWidth;
    target = target.filter(function (el) {
      // item karusel/baris geser yang berada di luar layar secara horizontal dibiarkan apa adanya
      var r = el.getBoundingClientRect();
      var tampak = Math.min(r.right, lebar) - Math.max(r.left, 0);
      return tampak >= Math.min(r.width, lebar) * 0.5;
    });
    target.forEach(function (el) {
      el.classList.add("reveal");
    });
    target.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < tinggi * 0.95) awal.push(el);
      else lain.push(el);
    });

    // 1. Entrance: bertahap berurutan (kelompokkan per induk agar jeda tidak terlalu lama)
    var hitung = new Map();
    awal.forEach(function (el) {
      var n = hitung.get(el.parentNode) || 0;
      hitung.set(el.parentNode, n + 1);
      tampilkan(el, n);
    });

    // 4. Scroll-triggered
    var obs = new IntersectionObserver(
      function (entri) {
        var antre = entri.filter(function (e) {
          return e.isIntersecting;
        });
        antre.forEach(function (e, i) {
          obs.unobserve(e.target);
          tampilkan(e.target, i);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    lain.forEach(function (el) {
      obs.observe(el);
    });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();

  /* ---------- 2. Fallback transisi halaman (tanpa View Transitions) ---------- */
  if (!dukungVT && !kurangiGerak) {
    window.addEventListener("click", function (e) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      var a = e.target.closest && e.target.closest("a[href]");
      if (
        !a ||
        (a.target && a.target !== "_self") ||
        a.hasAttribute("download")
      )
        return;
      var href = a.getAttribute("href") || "";
      if (/^(#|mailto:|tel:|javascript:)/i.test(href)) return;
      var url;
      try {
        url = new URL(a.href, location.href);
      } catch (_) {
        return;
      }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search)
        return; // anchor / halaman sama
      e.preventDefault();
      root.classList.add("is-leaving");
      setTimeout(function () {
        location.href = url.href;
      }, 240);
    });
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) root.classList.remove("is-leaving");
    });
  }
})();
