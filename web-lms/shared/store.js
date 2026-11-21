(function () {
  'use strict';
  /* Penyimpanan data di browser. Data asli selalu dimuat dari server (api.js); tidak ada data contoh. */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  var _n = new Date(), NOW = _n.getFullYear() + '-' + pad(_n.getMonth() + 1) + '-' + pad(_n.getDate());
  var KEY = 'peri_lms_v1';
  var SEED = { peserta: [], programs: [], undangan: [], pendaftaran: [], pendaftaranLembaga: [] };
  // Sisa data lama di browser (termasuk data contoh versi sebelumnya) dibuang; data terbaru dimuat ulang dari server.
  try { localStorage.removeItem(KEY); } catch (e) {}
  window.SEED = SEED;
  window.Store = {
    KEY: KEY,
    TODAY: NOW,
    load: function () {
      try { var s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) {}
      return JSON.parse(JSON.stringify(SEED));
    },
    save: function (db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} },
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} }
  };
})();
