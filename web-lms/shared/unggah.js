/* Kotak unggah bersama untuk admin (materi) dan peserta (tugas).
   Unggah.buat(id, opsi) mengembalikan HTML kotak; Unggah.ambil(id) mengembalikan pilihan pengguna;
   Unggah.kirim(endpoint, pasangan, progres, selesai) mengirimnya ke API.
   opsi: { banyak: true bila boleh banyak isian, materi: true bila boleh MP4, maks, maksKb, totalKb, lama: [{nama,kb,tipe,ref}] } */
(function () {
  'use strict';
  var DOK = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'zip'];
  var reg = {};
  var U = window.Unggah = {};

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ukuran(kb) { return !kb ? '' : kb < 1024 ? kb + ' KB' : (kb / 1024).toFixed(1) + ' MB'; }
  function root(id) { return document.querySelector('[data-ug="' + id + '"]'); }
  function galat(id, t) { var r = root(id); if (r) r.querySelector('[data-ugerr]').textContent = t || ''; }
  function jumlahKb(st) { return st.items.reduce(function (a, i) { return a + (i.kb || 0); }, 0); }

  function html(id, st) {
    var acc = st.ext.map(function (e) { return '.' + e; }).join(',');
    var batas = 'Maksimal ' + Math.round(st.maksKb / 1024) + ' MB per berkas' + (st.banyak ? ', ' + st.maks + ' isian' + (st.totalKb ? ', total ' + Math.round(st.totalKb / 1024) + ' MB' : '') : '') + '.';
    return '<div class="ug" data-ug="' + esc(id) + '">' +
      '<div class="ug-tab"><button type="button" class="on" data-ugtab="up">Upload</button><button type="button" data-ugtab="ln">Link</button></div>' +
      '<div data-pane="up"><div class="ug-zone" tabindex="0" role="button" data-ugzone>' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>' +
      '<div class="ug-t">Tarik berkas ke sini atau klik di sini untuk upload</div>' +
      '<div class="ug-s">Tipe berkas yang dapat diunggah: ' + st.ext.join(', ') + '. ' + batas + '</div>' +
      '<input type="file" data-ugfile hidden' + (st.banyak ? ' multiple' : '') + ' accept="' + acc + '"></div></div>' +
      '<div data-pane="ln" hidden><div class="ug-lrow"><input type="url" data-ugurl placeholder="https://contoh.com/..." autocomplete="off"><button type="button" class="ug-btn" data-ugadd>' + (st.banyak ? 'Tambah' : 'Pakai') + '</button></div>' +
      '<div class="ug-s">Alamat link harus diawali http:// atau https://</div></div>' +
      '<ul class="ug-list" data-uglist></ul><div class="ug-err" data-ugerr role="alert"></div></div>';
  }

  function paint(id) {
    var st = reg[id], r = root(id); if (!st || !r) return;
    r.querySelector('[data-uglist]').innerHTML = st.items.map(function (it, i) {
      var lbl = it.src === 'lama' ? 'Tersimpan' : (it.tipe === 'link' ? 'Link' : 'Berkas');
      return '<li><span class="ug-b">' + lbl + '</span><span class="ug-n" title="' + esc(it.nama) + '">' + esc(it.nama) + '</span><span class="ug-k">' + (it.tipe === 'link' ? '' : ukuran(it.kb)) + '</span><button type="button" class="ug-x" data-ughapus="' + i + '" aria-label="Hapus">&times;</button></li>';
    }).join('');
  }

  U.buat = function (id, o) {
    o = o || {};
    var st = reg[id] = { banyak: !!o.banyak, materi: !!o.materi, maks: o.maks || 10, maksKb: o.maksKb || 51200, totalKb: o.totalKb || 0, items: [] };
    st.ext = DOK.concat(st.materi ? ['mp4'] : []);
    (o.lama || []).forEach(function (it) { st.items.push({ src: 'lama', nama: it.nama, kb: it.kb || 0, tipe: it.tipe, ref: it.ref }); });
    setTimeout(function () { paint(id); }, 0);
    return html(id, st);
  };

  U.tambahBerkas = function (id, daftar) {
    var st = reg[id]; if (!st) return; galat(id, '');
    var arr = Array.prototype.slice.call(daftar || []); if (!arr.length) return;
    if (!st.banyak) arr = arr.slice(0, 1);
    for (var i = 0; i < arr.length; i++) {
      var f = arr[i], ext = f.name.split('.').pop().toLowerCase();
      if (st.ext.indexOf(ext) < 0) return galat(id, 'Jenis berkas ".' + ext + '" tidak diizinkan. Yang boleh: ' + st.ext.join(', ') + '.');
      if (f.size <= 0) return galat(id, 'Berkas "' + f.name + '" kosong.');
      if (f.size / 1024 > st.maksKb) return galat(id, 'Berkas "' + f.name + '" melebihi ' + Math.round(st.maksKb / 1024) + ' MB.');
    }
    var baru = arr.map(function (f) { return { src: 'file', tipe: 'berkas', nama: f.name, kb: Math.max(1, Math.ceil(f.size / 1024)), file: f }; });
    var gabung = st.banyak ? st.items.concat(baru) : baru;
    if (gabung.length > st.maks) return galat(id, 'Maksimal ' + st.maks + ' isian.');
    if (st.totalKb && gabung.reduce(function (a, x) { return a + (x.kb || 0); }, 0) > st.totalKb) return galat(id, 'Total ukuran melebihi ' + Math.round(st.totalKb / 1024) + ' MB.');
    st.items = gabung; paint(id);
  };

  U.tambahLink = function (id, url) {
    var st = reg[id]; if (!st) return; galat(id, '');
    url = String(url || '').trim(); if (!url) return;
    if (url.length > 500 || !/^https?:\/\/[^\s\/$.?#][^\s]*$/i.test(url)) return galat(id, 'Alamat link tidak valid. Harus diawali http:// atau https://');
    var host = url.replace(/^https?:\/\//i, '').split(/[\/?#]/)[0];
    var it = { src: 'link', tipe: 'link', nama: 'Link: ' + host, kb: 0, url: url };
    if (st.banyak) { if (st.items.length >= st.maks) return galat(id, 'Maksimal ' + st.maks + ' isian.'); st.items.push(it); } else st.items = [it];
    var r = root(id); if (r) r.querySelector('[data-ugurl]').value = '';
    paint(id);
  };

  U.ambil = function (id) {
    var st = reg[id] || { items: [] };
    var o = { keep: [], berkas: [], link: [] };
    st.items.forEach(function (it) {
      if (it.src === 'lama') o.keep.push(it.ref);
      else if (it.src === 'link') o.link.push(it.url);
      else o.berkas.push(it.file);
    });
    o.jumlah = st.items.length;
    return o;
  };

  // pasangan: daftar [nama, nilai]; nilai boleh teks atau File. Hasil: objek JSON dari server.
  U.kirim = function (endpoint, pasangan, progres, selesai) {
    var fd = new FormData();
    pasangan.forEach(function (p) { fd.append(p[0], p[1]); });
    var base = (window.Api && Api.base) || '../api/';
    var x = new XMLHttpRequest();
    x.open('POST', base + endpoint, true);
    if (window.Api && Api.csrf) x.setRequestHeader('X-CSRF-Token', Api.csrf);
    if (progres && x.upload) x.upload.onprogress = function (e) { if (e.lengthComputable) progres(e.loaded / e.total); };
    x.onload = function () {
      var r = null; try { r = JSON.parse(x.responseText); } catch (e) {}
      selesai(r || { ok: false, pesan: 'Server mengembalikan kode ' + x.status + '.' });
    };
    x.onerror = function () { selesai({ ok: false, pesan: 'Tidak dapat menghubungi server.' }); };
    x.send(fd);
  };

  function idDari(el) { var r = el.closest && el.closest('[data-ug]'); return r ? r.getAttribute('data-ug') : null; }

  document.addEventListener('click', function (e) {
    var t = e.target, id = idDari(t); if (!id) return;
    var tab = t.closest('[data-ugtab]');
    if (tab) {
      var r = root(id), ke = tab.getAttribute('data-ugtab');
      r.querySelectorAll('[data-ugtab]').forEach(function (b) { b.classList.toggle('on', b === tab); });
      r.querySelector('[data-pane="up"]').hidden = ke !== 'up';
      r.querySelector('[data-pane="ln"]').hidden = ke !== 'ln';
      if (ke === 'ln') r.querySelector('[data-ugurl]').focus();
      return;
    }
    if (t.closest('[data-ugadd]')) { U.tambahLink(id, root(id).querySelector('[data-ugurl]').value); return; }
    var x = t.closest('[data-ughapus]');
    if (x) { reg[id].items.splice(+x.getAttribute('data-ughapus'), 1); galat(id, ''); paint(id); return; }
    if (t.closest('[data-ugfile]')) return;
    var z = t.closest('[data-ugzone]');
    if (z) z.querySelector('[data-ugfile]').click();
  });
  document.addEventListener('change', function (e) {
    var f = e.target.closest && e.target.closest('[data-ugfile]'); if (!f) return;
    var id = idDari(f); if (!id) return;
    U.tambahBerkas(id, f.files); f.value = '';
  });
  document.addEventListener('keydown', function (e) {
    var id = idDari(e.target); if (!id) return;
    if (e.key === 'Enter' && e.target.matches('[data-ugurl]')) { e.preventDefault(); U.tambahLink(id, e.target.value); }
    else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-ugzone]')) { e.preventDefault(); e.target.querySelector('[data-ugfile]').click(); }
  });
  ['dragenter', 'dragover'].forEach(function (n) {
    document.addEventListener(n, function (e) { var z = e.target.closest && e.target.closest('[data-ugzone]'); if (!z) return; e.preventDefault(); z.classList.add('drag'); });
  });
  document.addEventListener('dragleave', function (e) { var z = e.target.closest && e.target.closest('[data-ugzone]'); if (z) z.classList.remove('drag'); });
  document.addEventListener('drop', function (e) {
    var z = e.target.closest && e.target.closest('[data-ugzone]'); if (!z) return;
    e.preventDefault(); z.classList.remove('drag');
    var id = idDari(z); if (id && e.dataTransfer) U.tambahBerkas(id, e.dataTransfer.files);
  });
})();