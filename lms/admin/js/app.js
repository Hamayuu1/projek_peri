(function () {
  'use strict';
  var KEY = 'peri_admin_v1';
  var AUTH = 'peri_admin_login';
  var TODAY = '2026-10-06';
  var WEEK_START = '2026-10-05';
  var WEEK_END = '2026-10-11';
  var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var EXT_OK = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png'];
  var MAX_KB = 10240;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function load() {
    try { var s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) {}
    return clone(window.SEED);
  }
  var db = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
  function loggedIn() { try { return sessionStorage.getItem(AUTH) === '1'; } catch (e) { return false; } }
  function setLogin(v) { try { if (v) sessionStorage.setItem(AUTH, '1'); else sessionStorage.removeItem(AUTH); } catch (e) {} }

  var ui = { prog: 'dsa', sesi: null, daftarTab: 'menunggu', q: '' };

  function $(s, r) { return (r || document).querySelector(s); }
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(t) {
    var e = $('#toast'); e.textContent = t; e.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('on'); }, 2400);
  }
  function tgl(s, panjang) {
    if (!s) return '-';
    var p = s.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
    return (panjang ? HARI[d.getDay()] + ', ' : '') + (+p[2]) + ' ' + BULAN[+p[1] - 1] + (panjang ? ' ' + p[0] : '');
  }
  function prog(id) { return db.programs.filter(function (p) { return p.id === id; })[0]; }
  function pes(id) { return db.peserta.filter(function (p) { return p.id === id; })[0]; }
  function hadirN(p, pid) { return p.sesi.filter(function (s) { return s.hadir.indexOf(pid) >= 0; }).length; }
  function persen(p, pid) { return p.sesi.length ? Math.round(hadirN(p, pid) / p.sesi.length * 100) : 0; }
  function sorted(p) { p.sesi.sort(function (a, b) { return a.tanggal < b.tanggal ? -1 : a.tanggal > b.tanggal ? 1 : 0; }); p.sesi.forEach(function (s, i) { s.no = i + 1; }); }
  function uid(pre) { return pre + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36); }
  function curProg() { var p = prog(ui.prog); if (!p) { ui.prog = db.programs[0] ? db.programs[0].id : null; p = prog(ui.prog); } return p; }
  function menunggu() { return db.pendaftaran.filter(function (r) { return r.status === 'menunggu'; }); }
  function statusChip(st) {
    if (st === 'buka') return '<span class="chip">Dibuka</span>';
    if (st === 'segera') return '<span class="chip g">Segera dibuka</span>';
    return '<span class="chip r">Ditutup</span>';
  }
  function progSelect(extra) {
    var o = db.programs.map(function (p) { return '<option value="' + p.id + '"' + (p.id === ui.prog ? ' selected' : '') + '>' + esc(p.nama) + '</option>'; }).join('');
    return '<div class="sel"><label>Program</label><select data-act="pilih-prog">' + o + '</select>' + (extra || '') + '</div>';
  }

  var ROUTES = {
    dashboard: ['Dashboard', 'Ringkasan pelatihan dan hal yang perlu ditindaklanjuti.'],
    program: ['Kelola Program', 'Tambah, ubah, atau hapus program pelatihan.'],
    jadwal: ['Kelola Jadwal', 'Atur sesi pada setiap program.'],
    materi: ['Kelola Materi', 'Unggah materi untuk tiap sesi.'],
    kehadiran: ['Catat Kehadiran', 'Tandai peserta yang hadir pada sebuah sesi.'],
    rekap: ['Rekap Progres', 'Pantau progres peserta dan tandai yang sudah selesai.'],
    pendaftaran: ['Pendaftaran', 'Setujui atau tolak peserta yang mendaftar ke program.']
  };
  function route() { var h = location.hash.replace('#/', ''); return ROUTES[h] ? h : 'dashboard'; }

  /* ---------- tampilan ---------- */
  function render() {
    var root = $('#root');
    if (!loggedIn()) { root.innerHTML = viewLogin(); return; }
    var r = route();
    var nav = Object.keys(ROUTES).map(function (k) {
      var bd = k === 'pendaftaran' && menunggu().length ? '<span class="bd">' + menunggu().length + '</span>' : '';
      return '<a href="#/' + k + '" class="' + (k === r ? 'on' : '') + '">' + ROUTES[k][0] + bd + '</a>';
    }).join('');
    root.innerHTML = '<div class="app"><aside class="side"><div class="brand"><div class="lg">P</div><div>E-Learning PERI<small>Panel pengurus</small></div></div><nav class="nav">' + nav + '</nav><div class="who"><b>Pengurus PERI</b>admin@contoh.id<br><button class="btn o s" style="margin-top:8px" data-act="keluar">Keluar</button></div></aside><main class="main"><div class="top"><div><h1>' + ROUTES[r][0] + '</h1><p class="sub">' + ROUTES[r][1] + '</p></div><div id="topact"></div></div>' + VIEWS[r]() + '</main></div>';
    window.scrollTo(0, 0);
  }
  function viewLogin() {
    return '<div class="login"><div class="card"><div class="brand"><div class="lg">P</div><div>E-Learning PERI<small>Panel pengurus</small></div></div><h2 style="text-align:center;margin:10px 0 16px">Masuk</h2><form data-form="login"><div class="fld"><label>Email</label><input name="email" value="admin@contoh.id" autocomplete="username"></div><div class="fld"><label>Kata sandi</label><input name="pw" type="password" value="admin123" autocomplete="current-password"></div><div class="err" id="lerr"></div><button class="btn" style="width:100%;margin-top:10px;padding:10px">Masuk</button></form><p class="sub" style="margin-top:12px;text-align:center">Akun contoh: admin@contoh.id / admin123</p></div></div>';
  }

  var VIEWS = {};

  VIEWS.dashboard = function () {
    var semua = {}, jml = 0, tot = 0;
    db.programs.forEach(function (p) {
      p.peserta.forEach(function (id) { semua[id] = 1; jml += persen(p, id); tot++; });
    });
    var minggu = [];
    db.programs.forEach(function (p) { p.sesi.forEach(function (s) { if (s.tanggal >= WEEK_START && s.tanggal <= WEEK_END) minggu.push({ p: p, s: s }); }); });
    minggu.sort(function (a, b) { return a.s.tanggal < b.s.tanggal ? -1 : 1; });
    var tanpaMateri = [];
    db.programs.forEach(function (p) { p.sesi.forEach(function (s) { if (!s.materi && s.tanggal >= TODAY) tanpaMateri.push({ p: p, s: s }); }); });
    tanpaMateri.sort(function (a, b) { return a.s.tanggal < b.s.tanggal ? -1 : 1; });
    var m = menunggu();
    var stats = '<div class="stats"><div class="stat"><span>Peserta aktif</span><b>' + Object.keys(semua).length + '</b><small>di ' + db.programs.length + ' program</small></div><div class="stat"><span>Sesi minggu ini</span><b>' + minggu.length + '</b><small>5 - 11 Okt 2026</small></div><div class="stat"><span>Rata-rata progres</span><b>' + (tot ? Math.round(jml / tot) : 0) + '%</b><small>seluruh peserta</small></div><div class="stat"><span>Pendaftaran menunggu</span><b>' + m.length + '</b><small><a href="#/pendaftaran">Tinjau sekarang</a></small></div></div>';
    var rows = minggu.map(function (x) {
      return '<tr><td>' + tgl(x.s.tanggal, true) + '</td><td>' + esc(x.p.nama) + '<div class="sm mut">Sesi ' + x.s.no + ': ' + esc(x.s.judul) + '</div></td><td>' + x.s.jam + '</td><td>' + x.s.mode + ', ' + esc(x.s.tempat) + '</td></tr>';
    }).join('');
    var mm = tanpaMateri.slice(0, 6).map(function (x) {
      return '<tr><td>' + esc(x.p.nama) + '<div class="sm mut">Sesi ' + x.s.no + ': ' + esc(x.s.judul) + '</div></td><td>' + tgl(x.s.tanggal) + '</td><td><a href="#/materi" data-act="ke-materi" data-id="' + x.p.id + '">Unggah</a></td></tr>';
    }).join('');
    var mp = m.slice(0, 5).map(function (r) {
      return '<tr><td>' + esc(pes(r.pid).nama) + '<div class="sm mut">' + esc(prog(r.prog).nama) + '</div></td><td>' + tgl(r.tgl) + '</td></tr>';
    }).join('');
    return stats +
      '<div class="card"><div class="hd"><h2>Sesi minggu ini</h2></div><div class="tw"><table><thead><tr><th>Hari</th><th>Kelas</th><th>Jam</th><th>Tempat</th></tr></thead><tbody>' + (rows || '<tr><td colspan="4" class="empty">Tidak ada sesi minggu ini</td></tr>') + '</tbody></table></div></div>' +
      '<div class="grid2"><div class="card"><div class="hd"><h2>Materi belum diunggah</h2><span class="chip y">' + tanpaMateri.length + ' sesi</span></div><div class="tw"><table><thead><tr><th>Sesi</th><th>Tanggal</th><th></th></tr></thead><tbody>' + (mm || '<tr><td colspan="3" class="empty">Semua sesi sudah punya materi</td></tr>') + '</tbody></table></div></div>' +
      '<div class="card"><div class="hd"><h2>Pendaftaran menunggu</h2><a href="#/pendaftaran">Lihat semua</a></div><div class="tw"><table><thead><tr><th>Peserta</th><th>Tanggal</th></tr></thead><tbody>' + (mp || '<tr><td colspan="2" class="empty">Tidak ada pendaftaran baru</td></tr>') + '</tbody></table></div></div></div>';
  };

  VIEWS.program = function () {
    var rows = db.programs.map(function (p) {
      return '<tr><td><b>' + esc(p.nama) + '</b><div class="sm mut">' + esc(p.tujuan) + '</div></td><td>' + esc(p.kategori) + '</td><td>' + p.sesi.length + ' sesi</td><td>' + p.peserta.length + ' / ' + p.kuota + '</td><td>' + statusChip(p.status) + '</td><td><div class="acts"><button class="btn o s" data-act="ubah-prog" data-id="' + p.id + '">Ubah</button><button class="btn r s" data-act="hapus-prog" data-id="' + p.id + '">Hapus</button></div></td></tr>';
    }).join('');
    return '<div class="card"><div class="hd"><h2>Daftar program (' + db.programs.length + ')</h2><button class="btn" data-act="tambah-prog">+ Tambah program</button></div><div class="tw"><table><thead><tr><th>Program</th><th>Kategori</th><th>Sesi</th><th>Peserta / Kuota</th><th>Pendaftaran</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="6" class="empty">Belum ada program</td></tr>') + '</tbody></table></div></div>';
  };

  VIEWS.jadwal = function () {
    var p = curProg();
    if (!p) return '<div class="card empty">Belum ada program. Tambahkan program lebih dulu.</div>';
    var rows = p.sesi.map(function (s) {
      return '<tr><td>' + s.no + '</td><td><b>' + esc(s.judul) + '</b></td><td>' + tgl(s.tanggal, true) + '</td><td>' + s.jam + '</td><td>' + s.mode + ', ' + esc(s.tempat) + '</td><td><div class="acts"><button class="btn o s" data-act="ubah-sesi" data-id="' + s.id + '">Ubah</button><button class="btn r s" data-act="hapus-sesi" data-id="' + s.id + '">Hapus</button></div></td></tr>';
    }).join('');
    return progSelect('<button class="btn" data-act="tambah-sesi" style="margin-left:auto">+ Tambah sesi</button>') +
      '<div class="card"><div class="hd"><h2>' + esc(p.nama) + '</h2><span class="sub">' + p.sesi.length + ' sesi</span></div><div class="tw"><table><thead><tr><th>#</th><th>Judul sesi</th><th>Tanggal</th><th>Jam</th><th>Cara dan tempat</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="6" class="empty">Belum ada sesi. Tekan Tambah sesi.</td></tr>') + '</tbody></table></div></div>';
  };

  VIEWS.materi = function () {
    var p = curProg();
    if (!p) return '<div class="card empty">Belum ada program.</div>';
    var rows = p.sesi.map(function (s) {
      var f = s.materi ? esc(s.materi.nama) + '<div class="sm mut">' + (s.materi.kb / 1024).toFixed(1) + ' MB</div>' : '<span class="chip y">Belum ada</span>';
      return '<tr><td>' + s.no + '</td><td><b>' + esc(s.judul) + '</b><div class="sm mut">' + tgl(s.tanggal) + '</div></td><td>' + f + '</td><td><div class="acts"><label class="btn ' + (s.materi ? 'o' : '') + ' s" style="cursor:pointer">' + (s.materi ? 'Ganti' : 'Unggah') + '<input type="file" data-act="unggah" data-id="' + s.id + '" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png" hidden></label>' + (s.materi ? '<button class="btn r s" data-act="hapus-materi" data-id="' + s.id + '">Hapus</button>' : '') + '</div></td></tr>';
    }).join('');
    return progSelect() + '<div class="note">Jenis berkas yang boleh: PDF, Word, PowerPoint, JPG, atau PNG, paling besar 10 MB. (Pada prototype ini hanya nama dan ukuran berkas yang disimpan.)</div><div class="card"><div class="hd"><h2>' + esc(p.nama) + '</h2></div><div class="tw"><table><thead><tr><th>#</th><th>Sesi</th><th>Materi</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="4" class="empty">Belum ada sesi pada program ini.</td></tr>') + '</tbody></table></div></div>';
  };

  VIEWS.kehadiran = function () {
    var p = curProg();
    if (!p) return '<div class="card empty">Belum ada program.</div>';
    if (!p.sesi.length) return progSelect() + '<div class="card empty">Program ini belum punya sesi.</div>';
    var s = p.sesi.filter(function (x) { return x.id === ui.sesi; })[0];
    if (!s) { s = p.sesi.filter(function (x) { return x.tanggal <= TODAY; }).pop() || p.sesi[0]; ui.sesi = s.id; }
    var opt = p.sesi.map(function (x) { return '<option value="' + x.id + '"' + (x.id === s.id ? ' selected' : '') + '>Sesi ' + x.no + ': ' + esc(x.judul) + '</option>'; }).join('');
    var rows = p.peserta.map(function (id) {
      var u = pes(id);
      return '<tr><td><input type="checkbox" class="ck" data-pid="' + id + '"' + (s.hadir.indexOf(id) >= 0 ? ' checked' : '') + '></td><td>' + esc(u.nama) + '</td><td class="mut">' + esc(u.email) + '</td></tr>';
    }).join('');
    var info = s.tanggal > TODAY ? '<div class="note y">Sesi ini belum berlangsung (' + tgl(s.tanggal, true) + '). Kehadiran tetap bisa dicatat lebih awal.</div>' : '';
    return progSelect('<label>Sesi</label><select data-act="pilih-sesi">' + opt + '</select>') + info +
      '<div class="card"><div class="hd"><div><h2>Sesi ' + s.no + ': ' + esc(s.judul) + '</h2><span class="sub">' + tgl(s.tanggal, true) + ' | ' + s.jam + ' | ' + s.mode + ', ' + esc(s.tempat) + '</span></div><div class="acts"><button class="btn o s" data-act="pilih-semua">Pilih semua</button><button class="btn o s" data-act="kosongkan">Kosongkan</button></div></div>' +
      (p.peserta.length ? '<div class="tw"><table><thead><tr><th style="width:60px">Hadir</th><th>Peserta</th><th>Email</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="hd" style="margin:14px 0 0"><span class="sub" id="hitung">Hadir ' + s.hadir.length + ' dari ' + p.peserta.length + ' peserta</span><button class="btn" data-act="simpan-hadir">Simpan kehadiran</button></div>' : '<div class="empty">Belum ada peserta di program ini.</div>') + '</div>';
  };

  VIEWS.rekap = function () {
    var p = curProg();
    if (!p) return '<div class="card empty">Belum ada program.</div>';
    var q = ui.q.toLowerCase();
    var list = p.peserta.filter(function (id) { return !q || pes(id).nama.toLowerCase().indexOf(q) >= 0; });
    var tot = 0, sel = 0;
    p.peserta.forEach(function (id) { tot += persen(p, id); if (p.selesai.indexOf(id) >= 0) sel++; });
    var rows = list.map(function (id) {
      var u = pes(id), pc = persen(p, id), done = p.selesai.indexOf(id) >= 0;
      return '<tr><td><b>' + esc(u.nama) + '</b><div class="sm mut">' + esc(u.email) + '</div></td><td>' + hadirN(p, id) + ' dari ' + p.sesi.length + ' sesi</td><td><div class="pc"><div class="bar" style="flex:1"><i style="width:' + pc + '%"></i></div><span>' + pc + '%</span></div></td><td>' + (done ? '<span class="chip">Selesai</span>' : '<span class="chip y">Berjalan</span>') + '</td><td>' + (done ? '<button class="btn o s" data-act="batal-selesai" data-pid="' + id + '">Batalkan</button>' : '<button class="btn g s" data-act="tandai-selesai" data-pid="' + id + '">Tandai selesai</button>') + '</td></tr>';
    }).join('');
    return progSelect('<input placeholder="Cari nama peserta..." value="' + esc(ui.q) + '" data-act="cari" style="margin-left:auto"><button class="btn o" data-act="ekspor">Unduh CSV</button>') +
      '<div class="stats" style="grid-template-columns:repeat(3,1fr)"><div class="stat"><span>Peserta</span><b>' + p.peserta.length + '</b></div><div class="stat"><span>Rata-rata progres</span><b>' + (p.peserta.length ? Math.round(tot / p.peserta.length) : 0) + '%</b></div><div class="stat"><span>Sudah selesai</span><b>' + sel + '</b><small>sertifikat tersedia untuk peserta ini</small></div></div>' +
      '<div class="card"><div class="tw"><table><thead><tr><th>Peserta</th><th>Kehadiran</th><th style="min-width:180px">Progres</th><th>Status</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="5" class="empty">Tidak ada peserta yang cocok</td></tr>') + '</tbody></table></div></div>';
  };

  VIEWS.pendaftaran = function () {
    var tabs = [['menunggu', 'Menunggu'], ['disetujui', 'Disetujui'], ['ditolak', 'Ditolak']].map(function (t) {
      var n = db.pendaftaran.filter(function (r) { return r.status === t[0]; }).length;
      return '<button class="' + (ui.daftarTab === t[0] ? 'on' : '') + '" data-act="tab-daftar" data-id="' + t[0] + '">' + t[1] + ' (' + n + ')</button>';
    }).join('');
    var list = db.pendaftaran.filter(function (r) { return r.status === ui.daftarTab; });
    var rows = list.map(function (r) {
      var p = prog(r.prog), u = pes(r.pid);
      var aksi = r.status === 'menunggu' ? '<div class="acts"><button class="btn s" data-act="setuju" data-id="' + r.id + '">Setujui</button><button class="btn r s" data-act="tolak" data-id="' + r.id + '">Tolak</button></div>' : (r.alasan ? '<span class="sm mut">' + esc(r.alasan) + '</span>' : '');
      return '<tr><td><b>' + esc(u.nama) + '</b><div class="sm mut">' + esc(u.email) + '</div></td><td>' + esc(p.nama) + '<div class="sm mut">' + p.peserta.length + ' / ' + p.kuota + ' kursi terisi</div></td><td>' + tgl(r.tgl) + '</td><td>' + aksi + '</td></tr>';
    }).join('');
    return '<div class="tabs">' + tabs + '</div><div class="card"><div class="tw"><table><thead><tr><th>Peserta</th><th>Program</th><th>Tanggal daftar</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="4" class="empty">Tidak ada data</td></tr>') + '</tbody></table></div></div>';
  };

  /* ---------- modal ---------- */
  function openModal(judul, isi, tombol, onSubmit, danger) {
    var m = $('#modal');
    m.innerHTML = '<div class="mbox"><h2>' + judul + '</h2><form data-form="modal">' + isi + '<div class="mf"><button type="button" class="btn o" data-act="tutup">Batal</button>' + (tombol ? '<button class="btn ' + (danger ? 'r' : '') + '">' + tombol + '</button>' : '') + '</div></form></div>';
    m.hidden = false; m._submit = onSubmit;
    var f = m.querySelector('input,select,textarea'); if (f) f.focus();
  }
  function closeModal() { var m = $('#modal'); m.hidden = true; m.innerHTML = ''; m._submit = null; }
  function val(form, n) { return (form.elements[n] ? form.elements[n].value : '').trim(); }
  function setErr(form, msg) {
    var e = form.querySelector('.err'); if (!e) { e = document.createElement('div'); e.className = 'err'; form.insertBefore(e, form.querySelector('.mf')); }
    e.textContent = msg;
  }
  function opts(arr, cur) { return arr.map(function (a) { return '<option' + (a === cur ? ' selected' : '') + '>' + a + '</option>'; }).join(''); }

  function formProg(p) {
    p = p || { nama: '', kategori: 'Digital', tujuan: '', periode: 'Triwulanan', angkatan: '', kuota: 30, status: 'buka' };
    var st = [['buka', 'Dibuka'], ['segera', 'Segera dibuka'], ['tutup', 'Ditutup']].map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === p.status ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('');
    return '<div class="fld"><label>Nama program</label><input name="nama" value="' + esc(p.nama) + '"></div><div class="row2"><div class="fld"><label>Kategori</label><select name="kategori">' + opts(['Digital', 'Usaha', 'Kriya', 'Keuangan', 'Kepemimpinan'], p.kategori) + '</select></div><div class="fld"><label>Periode</label><select name="periode">' + opts(['Triwulanan', 'Sekali jalan'], p.periode) + '</select></div></div><div class="fld"><label>Tujuan</label><textarea name="tujuan" rows="2">' + esc(p.tujuan) + '</textarea></div><div class="row2"><div class="fld"><label>Angkatan</label><input name="angkatan" value="' + esc(p.angkatan) + '"></div><div class="fld"><label>Kuota peserta</label><input name="kuota" type="number" min="1" value="' + p.kuota + '"></div></div><div class="fld"><label>Pendaftaran</label><select name="status">' + st + '</select></div>';
  }
  function bacaProg(f, lama) {
    var d = { nama: val(f, 'nama'), kategori: val(f, 'kategori'), periode: val(f, 'periode'), tujuan: val(f, 'tujuan'), angkatan: val(f, 'angkatan'), kuota: parseInt(val(f, 'kuota'), 10), status: val(f, 'status') };
    if (!d.nama) { setErr(f, 'Nama program wajib diisi.'); return null; }
    if (!d.tujuan) { setErr(f, 'Tujuan program wajib diisi.'); return null; }
    if (!d.kuota || d.kuota < 1) { setErr(f, 'Kuota minimal 1 peserta.'); return null; }
    if (lama && d.kuota < lama.peserta.length) { setErr(f, 'Kuota tidak boleh lebih kecil dari jumlah peserta saat ini (' + lama.peserta.length + ').'); return null; }
    return d;
  }
  function formSesi(s) {
    s = s || { judul: '', tanggal: '', jam: '09.00-12.00', mode: 'Luring', tempat: '' };
    var j = s.jam.split('-'), a = j[0].replace('.', ':'), b = (j[1] || '12.00').replace('.', ':');
    return '<div class="fld"><label>Judul sesi</label><input name="judul" value="' + esc(s.judul) + '"></div><div class="row2"><div class="fld"><label>Tanggal</label><input name="tanggal" type="date" value="' + s.tanggal + '"></div><div class="fld"><label>Cara</label><select name="mode">' + opts(['Luring', 'Daring'], s.mode) + '</select></div></div><div class="row2"><div class="fld"><label>Jam mulai</label><input name="a" type="time" value="' + a + '"></div><div class="fld"><label>Jam selesai</label><input name="b" type="time" value="' + b + '"></div></div><div class="fld"><label>Tempat atau tautan</label><input name="tempat" value="' + esc(s.tempat) + '"></div>';
  }
  function bacaSesi(f) {
    var d = { judul: val(f, 'judul'), tanggal: val(f, 'tanggal'), mode: val(f, 'mode'), tempat: val(f, 'tempat'), a: val(f, 'a'), b: val(f, 'b') };
    if (!d.judul) { setErr(f, 'Judul sesi wajib diisi.'); return null; }
    if (!d.tanggal) { setErr(f, 'Tanggal wajib diisi.'); return null; }
    if (!d.a || !d.b) { setErr(f, 'Jam mulai dan jam selesai wajib diisi.'); return null; }
    if (d.b <= d.a) { setErr(f, 'Jam selesai harus lebih akhir dari jam mulai.'); return null; }
    if (!d.tempat) { setErr(f, 'Tempat atau tautan wajib diisi.'); return null; }
    d.jam = d.a.replace(':', '.') + '-' + d.b.replace(':', '.');
    return d;
  }
  function cariSesi(id) { var p = curProg(), r = null; p.sesi.forEach(function (s) { if (s.id === id) r = s; }); return r; }

  /* ---------- aksi ---------- */
  var ACT = {
    'pilih-prog': function (el) { ui.prog = el.value; ui.sesi = null; ui.q = ''; render(); },
    'pilih-sesi': function (el) { ui.sesi = el.value; render(); },
    'keluar': function () { setLogin(false); render(); },
    'tutup': closeModal,
    'ke-materi': function (el) { ui.prog = el.getAttribute('data-id'); },
    'cari': function (el) { ui.q = el.value; var pos = el.selectionStart; render(); var i = $('input[data-act="cari"]'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } },
    'tab-daftar': function (el) { ui.daftarTab = el.getAttribute('data-id'); render(); },

    'tambah-prog': function () {
      openModal('Tambah program', formProg(), 'Simpan', function (f) {
        var d = bacaProg(f); if (!d) return;
        d.id = uid('prg'); d.peserta = []; d.selesai = []; d.sesi = [];
        db.programs.push(d); ui.prog = d.id; save(); closeModal(); render(); toast('Program ditambahkan');
      });
    },
    'ubah-prog': function (el) {
      var p = prog(el.getAttribute('data-id'));
      openModal('Ubah program', formProg(p), 'Simpan perubahan', function (f) {
        var d = bacaProg(f, p); if (!d) return;
        Object.keys(d).forEach(function (k) { p[k] = d[k]; }); save(); closeModal(); render(); toast('Program diperbarui');
      });
    },
    'hapus-prog': function (el) {
      var p = prog(el.getAttribute('data-id'));
      openModal('Hapus program?', '<p>Program <b>' + esc(p.nama) + '</b> beserta ' + p.sesi.length + ' sesi dan catatan kehadiran dari ' + p.peserta.length + ' peserta akan dihapus. Tindakan ini tidak bisa dibatalkan.</p>', 'Ya, hapus', function () {
        db.programs = db.programs.filter(function (x) { return x.id !== p.id; });
        db.pendaftaran = db.pendaftaran.filter(function (r) { return r.prog !== p.id; });
        save(); closeModal(); render(); toast('Program dihapus');
      }, true);
    },

    'tambah-sesi': function () {
      var p = curProg();
      openModal('Tambah sesi - ' + esc(p.nama), formSesi(), 'Simpan', function (f) {
        var d = bacaSesi(f); if (!d) return;
        p.sesi.push({ id: uid('s'), no: 0, judul: d.judul, tanggal: d.tanggal, jam: d.jam, mode: d.mode, tempat: d.tempat, materi: null, hadir: [] });
        sorted(p); save(); closeModal(); render(); toast('Sesi ditambahkan');
      });
    },
    'ubah-sesi': function (el) {
      var p = curProg(), s = cariSesi(el.getAttribute('data-id'));
      openModal('Ubah sesi ' + s.no, formSesi(s), 'Simpan perubahan', function (f) {
        var d = bacaSesi(f); if (!d) return;
        s.judul = d.judul; s.tanggal = d.tanggal; s.jam = d.jam; s.mode = d.mode; s.tempat = d.tempat;
        sorted(p); save(); closeModal(); render(); toast('Jadwal diperbarui');
      });
    },
    'hapus-sesi': function (el) {
      var p = curProg(), s = cariSesi(el.getAttribute('data-id'));
      openModal('Hapus sesi?', '<p>Sesi <b>' + s.no + ': ' + esc(s.judul) + '</b> akan dihapus, termasuk materi dan catatan kehadirannya (' + s.hadir.length + ' peserta hadir). Progres peserta akan dihitung ulang.</p>', 'Ya, hapus', function () {
        p.sesi = p.sesi.filter(function (x) { return x.id !== s.id; }); sorted(p); save(); closeModal(); render(); toast('Sesi dihapus');
      }, true);
    },

    'unggah': function (el) {
      var f = el.files[0]; if (!f) return;
      var ext = f.name.split('.').pop().toLowerCase();
      if (EXT_OK.indexOf(ext) < 0) { toast('Jenis berkas tidak diizinkan. Pakai PDF, Word, PowerPoint, JPG, atau PNG.'); el.value = ''; return; }
      if (f.size / 1024 > MAX_KB) { toast('Berkas terlalu besar. Maksimal 10 MB.'); el.value = ''; return; }
      var s = cariSesi(el.getAttribute('data-id'));
      s.materi = { nama: f.name, kb: Math.max(1, Math.round(f.size / 1024)) }; save(); render(); toast('Materi Sesi ' + s.no + ' diunggah');
    },
    'hapus-materi': function (el) {
      var s = cariSesi(el.getAttribute('data-id')); s.materi = null; save(); render(); toast('Materi dihapus');
    },

    'pilih-semua': function () { document.querySelectorAll('.ck').forEach(function (c) { c.checked = true; }); hitung(); },
    'kosongkan': function () { document.querySelectorAll('.ck').forEach(function (c) { c.checked = false; }); hitung(); },
    'simpan-hadir': function () {
      var p = curProg(), s = cariSesi(ui.sesi), h = [];
      document.querySelectorAll('.ck').forEach(function (c) { if (c.checked) h.push(c.getAttribute('data-pid')); });
      s.hadir = h; save(); render(); toast('Kehadiran Sesi ' + s.no + ' tersimpan (' + h.length + ' hadir)');
    },

    'tandai-selesai': function (el) {
      var p = curProg(), id = el.getAttribute('data-pid'), u = pes(id), pc = persen(p, id);
      var peringatan = pc < 100 ? '<div class="note y">Peserta baru hadir ' + hadirN(p, id) + ' dari ' + p.sesi.length + ' sesi (' + pc + '%). Pastikan ini memang sudah memenuhi syarat selesai.</div>' : '';
      openModal('Tandai selesai?', peringatan + '<p><b>' + esc(u.nama) + '</b> akan ditandai telah menyelesaikan <b>' + esc(p.nama) + '</b>. Setelah itu sertifikatnya bisa diunduh oleh peserta.</p>', 'Ya, tandai selesai', function () {
        if (p.selesai.indexOf(id) < 0) p.selesai.push(id); save(); closeModal(); render(); toast(u.nama + ' ditandai selesai');
      });
    },
    'batal-selesai': function (el) {
      var p = curProg(), id = el.getAttribute('data-pid'), u = pes(id);
      openModal('Batalkan status selesai?', '<p>Sertifikat <b>' + esc(u.nama) + '</b> tidak akan tersedia lagi sampai ditandai selesai kembali.</p>', 'Ya, batalkan', function () {
        p.selesai = p.selesai.filter(function (x) { return x !== id; }); save(); closeModal(); render(); toast('Status selesai dibatalkan');
      }, true);
    },
    'ekspor': function () {
      var p = curProg(), baris = [['Peserta', 'Email', 'Hadir', 'Total sesi', 'Progres (%)', 'Status']];
      p.peserta.forEach(function (id) { var u = pes(id); baris.push([u.nama, u.email, hadirN(p, id), p.sesi.length, persen(p, id), p.selesai.indexOf(id) >= 0 ? 'Selesai' : 'Berjalan']); });
      var csv = baris.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
      a.download = 'rekap-progres-' + p.id + '.csv'; document.body.appendChild(a); a.click(); a.remove();
      toast('Rekap diunduh');
    },

    'setuju': function (el) {
      var r = db.pendaftaran.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0], p = prog(r.prog);
      if (p.peserta.length >= p.kuota) { toast('Kuota ' + p.nama + ' sudah penuh.'); return; }
      if (p.peserta.indexOf(r.pid) < 0) p.peserta.push(r.pid);
      r.status = 'disetujui'; save(); render(); toast(pes(r.pid).nama + ' diterima di ' + p.nama);
    },
    'tolak': function (el) {
      var r = db.pendaftaran.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
      openModal('Tolak pendaftaran', '<p style="margin-bottom:10px"><b>' + esc(pes(r.pid).nama) + '</b> untuk <b>' + esc(prog(r.prog).nama) + '</b></p><div class="fld"><label>Alasan (wajib, akan terlihat oleh peserta)</label><textarea name="alasan" rows="2"></textarea></div>', 'Tolak', function (f) {
        var a = val(f, 'alasan'); if (!a) { setErr(f, 'Alasan penolakan wajib diisi.'); return; }
        r.status = 'ditolak'; r.alasan = a; save(); closeModal(); render(); toast('Pendaftaran ditolak');
      }, true);
    }
  };
  function hitung() {
    var n = document.querySelectorAll('.ck:checked').length, t = document.querySelectorAll('.ck').length, e = $('#hitung');
    if (e) e.textContent = 'Hadir ' + n + ' dari ' + t + ' peserta';
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var a = el.getAttribute('data-act');
    if (el.tagName === 'SELECT' || el.tagName === 'INPUT') return;
    if (ACT[a]) { if (el.tagName === 'A' && a !== 'ke-materi') e.preventDefault(); ACT[a](el); }
  });
  document.addEventListener('change', function (e) {
    var el = e.target.closest('[data-act]');
    if (el && (el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type === 'file'))) { ACT[el.getAttribute('data-act')](el); return; }
    if (e.target.classList && e.target.classList.contains('ck')) hitung();
  });
  document.addEventListener('input', function (e) {
    if (e.target.getAttribute && e.target.getAttribute('data-act') === 'cari') ACT.cari(e.target);
  });
  document.addEventListener('submit', function (e) {
    var f = e.target, k = f.getAttribute('data-form'); if (!k) return;
    e.preventDefault();
    if (k === 'login') {
      var em = val(f, 'email'), pw = val(f, 'pw'), er = $('#lerr');
      if (!em || !pw) { er.textContent = 'Email dan kata sandi wajib diisi.'; return; }
      if (em !== 'admin@contoh.id' || pw !== 'admin123') { er.textContent = 'Email atau kata sandi salah.'; return; }
      setLogin(true); location.hash = '#/dashboard'; render(); return;
    }
    var m = $('#modal'); if (m._submit) m._submit(f);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
  $('#modal').addEventListener('click', function (e) { if (e.target === this) closeModal(); });
  window.addEventListener('hashchange', render);
  render();
})();