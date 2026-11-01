(function () {
  'use strict';
  var Store = window.Store, TODAY = Store.TODAY, AUTH = 'peri_peserta', PREF = 'peri_pref', FAV = 'peri_fav';
  var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  var HARIF = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var CATS = ['Semua', 'Digital', 'Usaha', 'Kriya', 'Keuangan', 'Kepemimpinan'];
  var WARNA = ['c1', 'c2', 'c3', 'c4'];
  var IKON = { Digital: '&#128722;', Usaha: '&#128188;', Kriya: '&#129525;', Keuangan: '&#128176;', Kepemimpinan: '&#127775;' };
  var db = Store.load();
  var S = { prog: null, a1: null, a2: null, selDay: TODAY, tab: 'ringkasan', tug: null, cat: 'Semua', q: '', joinTab: 'kode', jmsg: '', jval: '', dark: false, notif: true };
  var cur = 'login';
  var PAGES = ['login', 'beranda', 'kelas', 'kdetail', 'program', 'jadwal', 'sesi', 'materi', 'progres', 'sertifikat'];

  function $(i) { return document.getElementById(i); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function readJSON(k, d) { try { var s = localStorage.getItem(k); return s ? JSON.parse(s) : d; } catch (e) { return d; } }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function pid() { try { return sessionStorage.getItem(AUTH); } catch (e) { return null; } }
  function setPid(v) { try { if (v) sessionStorage.setItem(AUTH, v); else sessionStorage.removeItem(AUTH); } catch (e) {} }
  function user() { var id = pid(); return db.peserta.filter(function (p) { return p.id === id; })[0]; }
  function save() { Store.save(db); }
  function toast(t) { var e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('on'); }, 2400); }

  /* ---------- tanggal ---------- */
  function dt(iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function iso(d) { function z(n) { return n < 10 ? '0' + n : '' + n; } return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
  function tgl(s, long) { if (!s) return '-'; var d = dt(s); return (long ? HARIF[d.getDay()] + ', ' : '') + d.getDate() + ' ' + BULAN[d.getMonth()] + (long === 2 ? ' ' + d.getFullYear() : ''); }
  function week() { var d = dt(TODAY), off = (d.getDay() + 6) % 7, r = []; for (var i = 0; i < 7; i++) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - off + i); r.push(iso(x)); } return r; }

  /* ---------- data peserta ---------- */
  function mine() { var id = pid(); return db.programs.filter(function (p) { return p.peserta.indexOf(id) >= 0; }); }
  function prog(id) { return db.programs.filter(function (p) { return p.id === id; })[0]; }
  function cp() { var m = mine(), p = m.filter(function (x) { return x.id === S.prog; })[0]; if (!p) { p = m[0]; S.prog = p ? p.id : null; } return p; }
  function hadirN(p) { var id = pid(); return p.sesi.filter(function (s) { return s.hadir.indexOf(id) >= 0; }).length; }
  function pct(p) { return p.sesi.length ? Math.round(hadirN(p) / p.sesi.length * 100) : 0; }
  function selesai(p) { return p.selesai.indexOf(pid()) >= 0; }
  function nextSes(p) { var r = null; p.sesi.forEach(function (s) { if (!r && s.tanggal >= TODAY) r = s; }); return r; }
  function sesiOf(p, no) { return p.sesi.filter(function (s) { return s.no === no; })[0]; }
  function sub(p, t) { var k = p.kumpul || {}; return k[t.id] && k[t.id][pid()]; }
  function tStatus(p, t) { if (sub(p, t)) return 'kumpul'; var s = sesiOf(p, t.sesi); if (s && s.tanggal > TODAY) return 'kunci'; return 'belum'; }
  function tugasBelum(p) { return (p.tugas || []).filter(function (t) { return tStatus(p, t) === 'belum'; }); }
  function evOn(d) { var r = []; mine().forEach(function (p) { p.sesi.forEach(function (s) { if (s.tanggal === d) r.push({ p: p, s: s }); }); }); return r; }
  function warna(p) { return WARNA[db.programs.indexOf(p) % 4]; }
  function lastReg(p) { var id = pid(), r = null; db.pendaftaran.forEach(function (x) { if (x.pid === id && x.prog === p.id) r = x; }); return r; }
  function jamLabel(s) { return s.jam.replace(/\./g, ':'); }

  var IC = {
    sesi: '<svg viewBox="0 0 24 24"><path d="M6 2h13a1 1 0 0 1 1 1v15H7a1 1 0 0 0 0 2h13v2H7a3 3 0 0 1-3-3V4a2 2 0 0 1 2-2z"/></svg>',
    org: '<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z"/></svg>',
    clk: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm-1 3v6l5 3 1-1.600-4-2.400V7z"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.500A2.500 2.500 0 1 1 12 6a2.500 2.500 0 0 1 0 5.500z"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M12 3 2 12h3v8h5v-5h4v5h5v-8h3z"/></svg>',
    kelas: '<svg viewBox="0 0 24 24"><circle cx="7" cy="9" r="3"/><path d="M1.500 19c0-3 2.400-5 5.500-5s5.500 2 5.500 5zM13 5h9v8h-9z"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><path d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3zM5 9v10h14V9z"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M4 20V4h2v14h14v2zm4-4v-5h3v5zm5 0V7h3v9z"/></svg>',
    cert: '<svg viewBox="0 0 24 24"><path d="M12 2a6 6 0 0 1 3.600 10.800L17 22l-5-3-5 3 1.400-9.200A6 6 0 0 1 12 2z"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M6 2h13a1 1 0 0 1 1 1v15H7a1 1 0 0 0 0 2h13v2H7a3 3 0 0 1-3-3V4a2 2 0 0 1 2-2zm2 3v2h9V5z"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M12 22a2.500 2.500 0 0 0 2.500-2.500h-5A2.500 2.500 0 0 0 12 22zm7-6V11a7 7 0 0 0-5-6.700V3a2 2 0 0 0-4 0v1.300A7 7 0 0 0 5 11v5l-2 2v1h18v-1z"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M21 14.500A9 9 0 0 1 9.500 3 9 9 0 1 0 21 14.500z"/></svg>',
    lang: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.900 9h-3a15 15 0 0 0-1.200-5A8 8 0 0 1 18.900 11zM12 4c.8 1 1.600 3 1.900 7h-3.800C10.400 7 11.200 5 12 4zM4.100 13h3a15 15 0 0 0 1.200 5A8 8 0 0 1 4.100 13zm3-2h-3a8 8 0 0 1 4.200-5 15 15 0 0 0-1.200 5zM12 20c-.8-1-1.600-3-1.900-7h3.800c-.3 4-1.100 6-1.900 7zm2.700-2a15 15 0 0 0 1.200-5h3a8 8 0 0 1-4.200 5z"/></svg>',
    help: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 16h-2v-2h2zm2.100-7.800-.9.9c-.7.7-1.200 1.200-1.200 2.400h-2v-.5c0-1 .5-1.800 1.200-2.500l1.200-1.200a1.700 1.700 0 0 0 .5-1.200 2 2 0 0 0-4 0H8a4 4 0 0 1 8 0c0 .9-.4 1.700-.9 2.100z"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M6 2h8l6 6v14H6zm7 1.500V9h5.500z"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M4 3h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8l-5 4V4a1 1 0 0 1 1-1z"/></svg>'
  };

  /* ---------- navigasi ---------- */
  function parse() { var h = location.hash.replace('#/', '').replace('#', '').split('/'); return { p: h[0] || '', a: h[1], b: h[2] }; }
  function go(p, a, b, replace) {
    drawer(0); closeSheet();
    S.a1 = a || null; S.a2 = b || null;
    if (p === 'kdetail') { S.tab = 'ringkasan'; S.tug = null; }
    var h = '#/' + p + (a ? '/' + a : '') + (b ? '/' + b : '');
    try { if (replace) history.replaceState(null, '', h); else history.pushState(null, '', h); } catch (e) { location.hash = h; }
    show(p);
  }
  function show(p) {
    db = Store.load();
    if (!pid() || !user()) p = 'login';
    if (PAGES.indexOf(p) < 0) p = 'beranda';
    var lg = p === 'login';
    $('login').classList.toggle('on', lg); $('app').style.display = lg ? 'none' : 'block';
    PAGES.forEach(function (x) { var e = $(x); if (x !== 'login' && e) e.classList.toggle('on', x === p); });
    var map = { beranda: 'beranda', jadwal: 'beranda', sesi: 'beranda', materi: 'beranda', progres: 'beranda', sertifikat: 'beranda', kelas: 'kelas', kdetail: 'kelas', program: 'program' };
    ['beranda', 'kelas', 'program'].forEach(function (x) { $('b-' + x).classList.toggle('on', map[p] === x); });
    cur = p;
    $('app').classList.toggle('noTop', p === 'kelas' || p === 'kdetail');
    $('fab').classList.toggle('on', p === 'kelas');
    if (lg) { rLogin(); return; }
    $('topnm').textContent = user().nama; $('toplogo').src = window.LOGO || '';
    var R = { beranda: rBeranda, kelas: rKelas, kdetail: rK, program: rProgram, jadwal: rJadwal, sesi: rSesi, materi: rMateri, progres: rProgres, sertifikat: rSert };
    R[p](); window.scrollTo(0, 0);
  }
  function keluar() { setPid(null); drawer(0); closeSheet(); go('login', null, null, true); }

  /* ---------- login ---------- */
  function rLogin() {
    $('login').style.paddingTop = '60px';
    $('login').innerHTML = '<div style="text-align:center;margin-bottom:22px"><img src="' + (window.LOGO || '') + '" alt="PERI" style="height:84px"><div class="big" style="font-size:26px;font-weight:600;margin-top:6px">E-Learning PERI</div><p class="m sm">Perempuan Kreatif Indonesia</p></div><div class="card"><h2>Masuk</h2><form data-form="login"><label>Email</label><input class="in" name="email" value="aditya@contoh.id" autocomplete="username"><label>Kata sandi</label><input class="in" name="pw" type="password" value="contoh123" autocomplete="current-password"><div class="err" id="lerr"></div><br><button class="btn w">Masuk</button></form></div><p class="m sm" style="text-align:center">Akun contoh: aditya@contoh.id / contoh123</p>';
  }
  function doLogin(f) {
    var em = f.elements.email.value.trim().toLowerCase(), pw = f.elements.pw.value, e = $('lerr');
    if (!em || !pw) { e.textContent = 'Email dan kata sandi wajib diisi.'; return; }
    var u = db.peserta.filter(function (x) { return x.email.toLowerCase() === em && x.pw === pw; })[0];
    if (!u) { e.textContent = 'Email atau kata sandi salah.'; return; }
    setPid(u.id); S.prog = null; go('beranda', null, null, true);
  }

  /* ---------- beranda ---------- */
  function rBeranda() {
    var u = user(), p = cp(), h = evOn(TODAY)[0], first = u.nama.split(' ')[0];
    var html = '<p class="m sm" style="margin:-2px 0 10px">Halo, ' + esc(first) + ' &#128075;</p>';
    if (h) html += '<div class="card" data-a="go" data-p="kelas" style="background:var(--t);color:#fff;border-color:var(--t);cursor:pointer;padding:12px 14px"><div class="sm" style="opacity:.85">Kelas hari ini &middot; ' + tgl(h.s.tanggal, 1) + '</div><div style="font-weight:600;font-size:15px">' + esc(h.p.nama) + ' &middot; Sesi ' + h.s.no + '</div><div class="sm" style="opacity:.9">' + jamLabel(h.s) + ' &middot; ' + h.s.mode + ', ' + esc(h.s.tempat) + '</div></div>';
    if (!p) {
      $('beranda').innerHTML = html + '<div class="card"><h2>Belum ada program</h2><p class="m sm" style="margin-bottom:12px">Anda belum tergabung di program mana pun. Lihat program yang dibuka atau gabung memakai kode kelas.</p><button class="btn" data-a="go" data-p="program">Lihat program</button> <button class="btn o" data-a="join">Gabung kelas</button></div>';
      return;
    }
    var n = nextSes(p), tb = []; mine().forEach(function (x) { tb = tb.concat(tugasBelum(x).map(function (t) { return { t: t, p: x }; })); });
    tb.sort(function (a, b) { return a.t.due < b.t.due ? -1 : 1; });
    var sw = mine().length > 1 ? '<div class="sel2"><select data-a="pilih-prog">' + mine().map(function (x) { return '<option value="' + x.id + '"' + (x.id === p.id ? ' selected' : '') + '>' + esc(x.nama) + '</option>'; }).join('') + '</select></div>' : '';
    var mat = p.sesi.filter(function (s) { return s.materi; }).map(function (s) { return '<div class="row"><div class="t">Sesi ' + s.no + ' : ' + esc(s.judul) + '<small>' + esc(s.materi.nama) + '</small></div><button class="btn o" data-a="unduh" data-n="' + esc(s.materi.nama) + '">Unduh</button></div>'; }).join('');
    html += sw + '<div class="card"><h1>' + esc(p.nama) + '</h1><p class="m sm" style="margin-bottom:10px">' + esc(p.desc) + '</p><dl><dt>Tujuan</dt><dd>' + esc(p.tujuan) + '</dd><dt>Periode</dt><dd>' + esc(p.periode) + '</dd><dt>Angkatan</dt><dd>' + esc(p.angkatan) + '</dd></dl><div style="text-align:right"><button class="btn" data-a="go" data-p="kdetail" data-x="' + p.id + '">Lebih lanjut</button></div></div>';
    html += '<div style="display:grid;grid-template-columns:1.1fr 1fr;gap:12px"><div class="card"><h2>Jadwal sesi mendatang</h2>' + (n ? '<b style="color:var(--chip)">' + tgl(n.tanggal, 1) + '</b><div>' + esc(n.judul) + '</div><div class="m sm">' + jamLabel(n) + ' &nbsp; Sesi #' + n.no + '</div><div style="margin:8px 0"><span class="chip">' + n.mode + '</span> <span class="sm m">di ' + esc(n.tempat) + '</span></div><div style="text-align:right"><button class="btn" data-a="go" data-p="sesi" data-x="' + p.id + '" data-y="' + n.id + '">Lebih lanjut</button></div>' : '<p class="m sm">Semua sesi sudah berlangsung.</p>') + '</div>' +
      '<div class="card" data-a="go" data-p="progres" style="cursor:pointer"><h2>Progres Anda</h2><div class="big">' + pct(p) + '%</div><div class="bar"><i style="width:' + pct(p) + '%"></i></div><div class="m sm">' + hadirN(p) + ' dari ' + p.sesi.length + ' sesi dihadiri</div><div style="margin-top:14px"><span class="chip ' + (selesai(p) ? '' : 'y') + '">' + (selesai(p) ? 'Selesai' : 'Sedang berjalan') + '</span></div></div></div>';
    if (tb.length) html += '<div class="warn" data-a="go" data-p="kdetail" data-x="' + tb[0].p.id + '" data-t="tugas" style="cursor:pointer">&#128221; ' + tb.length + ' tugas belum dikumpulkan &middot; tenggat ' + tgl(tb[0].t.due) + '</div>';
    html += selesai(p) ? '<div class="warn" data-a="go" data-p="sertifikat" style="cursor:pointer;background:var(--soft);color:var(--chip);border-color:var(--t)">&#127942; Sertifikat sudah tersedia</div>' : '<div class="warn" data-a="go" data-p="sertifikat" style="cursor:pointer">&#9888; Sertifikat belum tersedia</div>';
    html += '<div class="card"><h2>Materi Pelatihan</h2>' + (mat || '<p class="m sm">Belum ada materi yang diunggah.</p>') + '</div>';
    $('beranda').innerHTML = html;
  }

  /* ---------- kelas ---------- */
  function rKelas() {
    var wk = week();
    var days = wk.map(function (d, i) { var e = evOn(d).length > 0; return '<button class="' + (d === S.selDay ? 'sel ' : '') + (d === TODAY ? 'td ' : '') + (e ? 'ev' : '') + '" data-a="hari" data-x="' + d + '"><b>' + HARI[(i + 1) % 7] + '</b><span>' + dt(d).getDate() + '</span><i></i></button>'; }).join('');
    var ev = evOn(S.selDay);
    var dc = ev.length ? ev.map(function (x) { return '<div class="evt" data-a="go" data-p="kdetail" data-x="' + x.p.id + '" style="cursor:pointer"><h3>' + esc(x.p.nama) + '</h3><div class="g2"><span>' + IC.sesi + 'sesi ' + x.s.no + '</span><span>' + IC.clk + jamLabel(x.s) + '</span><span>' + IC.org + esc(x.p.fas) + '</span><span>' + IC.pin + x.s.mode + ', ' + esc(x.s.tempat) + '</span></div></div>'; }).join('') : '<div class="none">Tidak ada kelas pada ' + tgl(S.selDay, 1) + '.</div>';
    var list = mine().map(function (p) { var n = nextSes(p), tb = tugasBelum(p).length; return '<div class="cc" data-a="go" data-p="kdetail" data-x="' + p.id + '" style="cursor:pointer"><div class="hd ' + warna(p) + '"><h3>' + esc(p.nama) + '</h3><p>' + esc(p.fas) + '</p></div><div class="ft"><span class="m">' + (selesai(p) ? 'Program selesai' : n ? 'Berikutnya: Sesi ' + n.no + ', ' + tgl(n.tanggal) : 'Semua sesi selesai') + '</span>' + (tb ? '<span class="chip y">' + tb + ' tugas</span>' : '<span class="chip">' + pct(p) + '%</span>') + '</div></div>'; }).join('');
    $('kelas').innerHTML = '<div style="height:6px"></div><div class="wk"><div class="wkt">Kelas Minggu ini</div><div class="wkd">' + days + '</div></div><div class="dayc">' + dc + '</div><div style="padding:0 16px"><div class="sec"><h2>Kelas saya</h2><span class="m sm">' + mine().length + ' kelas</span></div>' + (list || '<div class="cert">Anda belum tergabung di kelas mana pun</div>') + '<p class="m sm" style="text-align:center">Belum menemukan kelas Anda? Tekan <b>Gabung kelas</b>.</p></div>';
  }

  function rK() {
    var p = prog(S.a1);
    if (!p || p.peserta.indexOf(pid()) < 0) { go('kelas', null, null, true); return; }
    var tl = { ringkasan: 'Ringkasan', materi: 'Materi', tugas: 'Tugas' }, tb = tugasBelum(p).length;
    var tabs = '<div class="tabs">' + Object.keys(tl).map(function (t) { return '<button class="' + (S.tab === t ? 'on' : '') + '" data-a="tab" data-x="' + t + '">' + tl[t] + (t === 'tugas' && tb ? ' (' + tb + ')' : '') + '</button>'; }).join('') + '</div>';
    var hd = '<div class="kh ' + warna(p) + '"><button class="bk" data-a="keluar-kelas">&larr; Daftar kelas</button><h1>' + esc(p.nama) + '</h1><p>' + esc(p.fas) + ' &middot; Kode kelas ' + esc(p.kode) + '</p></div>';
    var b = '';
    if (S.tab === 'ringkasan') {
      var n = nextSes(p);
      b = '<div class="card"><h2>Tentang kelas</h2><p class="m" style="font-size:13px">' + esc(p.desc) + '</p></div>' +
        (n ? '<div class="card"><h2>Sesi berikutnya</h2><b style="color:var(--chip)">' + tgl(n.tanggal, 1) + '</b><div>Sesi ' + n.no + ': ' + esc(n.judul) + '</div><div class="m sm" style="margin-top:2px">' + jamLabel(n) + ' &middot; ' + n.mode + ', ' + esc(n.tempat) + '</div></div>' : '') +
        '<div class="card"><h2>Kehadiran</h2><div class="big" style="font-size:30px">' + pct(p) + '%</div><div class="bar"><i style="width:' + pct(p) + '%"></i></div><div class="m sm">' + hadirN(p) + ' dari ' + p.sesi.length + ' sesi dihadiri</div></div>' +
        (p.ann ? '<div class="card"><h2>Pengumuman</h2><div class="sm m">Dari ' + esc(p.fas) + '</div><p style="font-size:13px;margin-top:4px">' + esc(p.ann) + '</p></div>' : '');
    }
    if (S.tab === 'materi') {
      b = '<div class="card">' + (p.sesi.length ? p.sesi.map(function (s) { return '<div class="row"><div class="t">Sesi ' + s.no + ' : ' + esc(s.judul) + '<small>' + (s.materi ? esc(s.materi.nama) : 'Belum tersedia') + '</small></div>' + (s.materi ? '<button class="btn o" data-a="unduh" data-n="' + esc(s.materi.nama) + '">Unduh</button>' : '<button class="btn d">Unduh</button>') + '</div>'; }).join('') : '<p class="m sm">Belum ada sesi.</p>') + '</div>';
    }
    if (S.tab === 'tugas') {
      var t = S.tug ? (p.tugas || []).filter(function (x) { return x.id === S.tug; })[0] : null;
      if (t) {
        var sb = sub(p, t);
        b = '<button class="back" data-a="semua-tugas">&larr; Semua tugas</button><div class="card"><span class="chip ' + (sb ? '' : 'y') + '">' + (sb ? 'Dikumpulkan' : 'Belum dikumpulkan') + '</span><h1 style="margin-top:8px;font-size:18px">' + esc(t.judul) + '</h1><p class="m sm">Terkait Sesi ' + t.sesi + ' &middot; Tenggat ' + tgl(t.due) + '</p><p style="margin-top:10px;font-size:13px">' + esc(t.desc) + '</p></div>' +
          (sb ? '<div class="card"><h2>Pekerjaan Anda</h2><div class="row"><div class="t">' + esc(sb.file) + '<small>Dikirim ' + esc(sb.at) + '</small></div></div><button class="btn o w" style="font-size:13px" data-a="batal-kumpul" data-x="' + t.id + '">Batalkan pengiriman</button></div>'
            : '<div class="card"><h2>Pekerjaan Anda</h2><label class="att" for="fl" id="fln" style="display:block;cursor:pointer;margin:0 0 10px">&#128206; Pilih berkas (foto, PDF, atau dokumen)</label><input id="fl" type="file" style="display:none"><label style="margin-top:0">Catatan untuk fasilitator (boleh kosong)</label><textarea class="in" rows="2" id="cat"></textarea><div id="te" class="err"></div><br><button class="btn w" data-a="kumpul" data-x="' + t.id + '">Kumpulkan tugas</button></div>');
      } else {
        b = '<div class="card">' + ((p.tugas || []).map(function (x) { var st = tStatus(p, x), chip = st === 'kumpul' ? '<span class="chip">Dikumpulkan</span>' : st === 'belum' ? '<span class="chip y">Belum</span>' : '<span class="chip g">Terkunci</span>'; return '<div class="row" style="cursor:pointer" data-a="buka-tugas" data-x="' + x.id + '"><div class="t">' + esc(x.judul) + '<small>Sesi ' + x.sesi + ' &middot; tenggat ' + tgl(x.due) + '</small></div>' + chip + '</div>'; }).join('') || '<p class="m sm">Belum ada tugas pada kelas ini.</p>') + '</div>';
      }
    }
    $('kdetail').innerHTML = hd + tabs + '<div style="padding:16px">' + b + '</div>';
  }

  /* ---------- gabung kelas ---------- */
  function rJoin() {
    var tb = [['kode', 'Kode kelas'], ['tautan', 'Tautan'], ['email', 'Email']];
    var h = '<div class="gr"></div><h2>Gabung ke kelas</h2><div class="seg">' + tb.map(function (t) { return '<button class="' + (S.joinTab === t[0] ? 'on' : '') + '" data-a="join-tab" data-x="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (S.joinTab === 'kode') h += '<p class="m sm">Masukkan kode kelas dari pengurus atau fasilitator.</p><label>Kode kelas</label><input id="jk" class="in" placeholder="Contoh: KRIYA26" value="' + esc(S.jval) + '" style="text-transform:uppercase"><div class="err">' + esc(S.jmsg) + '</div><br><button class="btn w" data-a="join-kode">Gabung</button><p class="m sm" style="margin-top:10px">Kode ada di halaman Ringkasan setiap kelas. Contoh untuk uji coba: <b>KRIYA26</b></p>';
    if (S.joinTab === 'tautan') h += '<p class="m sm">Tempel tautan undangan yang Anda terima lewat pesan.</p><label>Tautan undangan</label><input id="jt" class="in" placeholder="https://elearning-peri.id/gabung/..." value="' + esc(S.jval) + '"><div class="err">' + esc(S.jmsg) + '</div><br><button class="btn w" data-a="join-taut">Gabung lewat tautan</button><p class="m sm" style="margin-top:10px">Contoh: elearning-peri.id/gabung/KRIYA26</p>';
    if (S.joinTab === 'email') {
      var iv = db.undangan.filter(function (u) { return u.pid === pid() && u.status === 'menunggu'; });
      h += '<p class="m sm">Undangan yang dikirim pengurus ke email akun Anda.</p>' + (iv.length ? iv.map(function (u) { var p = db.programs.filter(function (x) { return (x.kode || '').toUpperCase() === u.kode.toUpperCase(); })[0]; return '<div class="pc" style="display:block"><h3>' + esc(p ? p.nama : u.kode) + '</h3><div class="mt">Diundang oleh ' + esc(u.dari) + ' &middot; ' + esc(user().email) + '</div><div style="display:flex;gap:8px"><button class="btn" data-a="terima-undang" data-x="' + u.id + '">Terima</button><button class="btn o" data-a="tolak-undang" data-x="' + u.id + '">Tolak</button></div></div>'; }).join('') : '<div class="cert">Tidak ada undangan baru</div>');
    }
    openSheet(h);
  }
  function joinKode(k) {
    S.jval = (k || '').trim(); k = S.jval.toUpperCase();
    var p = db.programs.filter(function (x) { return (x.kode || '').toUpperCase() === k; })[0];
    if (!k) { S.jmsg = 'Kode kelas belum diisi.'; return rJoin(); }
    if (!p) { S.jmsg = 'Kode tidak ditemukan. Periksa lagi atau tanyakan ke pengurus.'; return rJoin(); }
    if (p.peserta.indexOf(pid()) >= 0) { S.jmsg = 'Anda sudah tergabung di kelas ini.'; return rJoin(); }
    if (p.peserta.length >= p.kuota) { S.jmsg = 'Kuota kelas ini sudah penuh.'; return rJoin(); }
    p.peserta.push(pid());
    db.undangan.forEach(function (u) { if (u.pid === pid() && u.kode.toUpperCase() === k && u.status === 'menunggu') u.status = 'diterima'; });
    save(); closeSheet(); toast('Berhasil bergabung ke ' + p.nama); show(cur);
  }

  /* ---------- program baru ---------- */
  function rProgram() {
    var m = mine(), id = pid();
    var minis = m.map(function (p) { return '<div class="mini ' + warna(p) + '" data-a="go" data-p="kdetail" data-x="' + p.id + '" style="cursor:pointer">' + esc(p.nama) + '<small>hadir ' + hadirN(p) + ' dari ' + p.sesi.length + ' sesi</small></div>'; }).join('');
    var kats = m.map(function (p) { return p.kategori; });
    var kand = db.programs.filter(function (p) { var r = lastReg(p); return p.peserta.indexOf(id) < 0 && p.status === 'buka' && p.peserta.length < p.kuota && (!r || r.status === 'ditolak') && kats.indexOf(p.kategori) >= 0; })[0];
    var chips = CATS.map(function (c) { return '<button class="' + (S.cat === c ? 'on' : '') + '" data-a="kat" data-x="' + c + '">' + c + '</button>'; }).join('');
    var q = S.q.toLowerCase();
    var vis = db.programs.filter(function (p) { return p.peserta.indexOf(id) < 0 && (S.cat === 'Semua' || p.kategori === S.cat || (S.cat === 'Usaha' && p.kategori === 'Keuangan')) && (!q || (p.nama + ' ' + p.desc).toLowerCase().indexOf(q) >= 0); });
    var fav = readJSON(FAV + '_' + id, {});
    $('program').innerHTML = '<h1 style="margin-bottom:2px">Program</h1><p class="m sm" style="margin-bottom:12px">Temukan program PERI yang ingin Anda ikuti berikutnya.</p><input class="in" id="cari" placeholder="Cari program..." value="' + esc(S.q) + '"><div class="chips">' + chips + '</div>' +
      '<div class="sec" style="margin-top:8px"><h2>Program yang saya ikuti</h2></div>' + (minis ? '<div class="hs">' + minis + '</div>' : '<p class="m sm">Belum ada.</p>') +
      (kand ? '<div class="card" style="margin-top:16px;border-color:var(--gold);background:var(--warn);color:var(--warnink)"><div class="sm">&#10024; Cocok untuk Anda</div><b>' + esc(kand.nama) + '</b><div class="sm" style="margin:2px 0 8px">Satu kategori dengan program yang sedang Anda ikuti (' + esc(kand.kategori) + ').</div><button class="btn" data-a="detail-prog" data-x="' + kand.id + '">Lihat program</button></div>' : '') +
      '<div class="sec"><h2>Program baru</h2><span class="m sm">' + vis.length + ' program</span></div><div id="plist">' + (vis.map(function (p) { return cardP(p, fav); }).join('') || '<div class="cert">Tidak ada program yang cocok</div>') + '</div>';
  }
  function statusP(p) {
    var r = lastReg(p);
    if (r && r.status === 'menunggu') return { chip: '<span class="chip y">Menunggu konfirmasi</span>', can: false, state: 'menunggu' };
    if (r && r.status === 'ditolak') return { chip: '<span class="chip r">Ditolak</span>', can: p.status === 'buka' && p.peserta.length < p.kuota, state: 'ditolak', alasan: r.alasan };
    if (p.status === 'segera') return { chip: '<span class="chip g">Segera dibuka</span>', can: false, state: 'segera' };
    if (p.status === 'tutup') return { chip: '<span class="chip r">Pendaftaran ditutup</span>', can: false, state: 'tutup' };
    if (p.peserta.length >= p.kuota) return { chip: '<span class="chip r">Kuota penuh</span>', can: false, state: 'penuh' };
    return { chip: '<span class="chip">Dibuka</span>', can: true, state: 'buka' };
  }
  function cardP(p, fav) {
    var st = statusP(p), sisa = p.kuota - p.peserta.length;
    return '<div class="pc"><div class="pi ' + warna(p) + '">' + (IKON[p.kategori] || '&#128214;') + '</div><div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;gap:6px"><h3 data-a="detail-prog" data-x="' + p.id + '" style="cursor:pointer">' + esc(p.nama) + '</h3><button class="star ' + (fav[p.id] ? 'on' : '') + '" data-a="fav" data-x="' + p.id + '" aria-label="Simpan">&#9733;</button></div><div class="mt">' + esc(p.kategori) + ' &middot; ' + p.sesi.length + ' sesi &middot; ' + esc(p.periode) + '</div>' +
      (p.status === 'segera' ? '' : '<div class="q"><i style="width:' + Math.min(100, Math.round(p.peserta.length / p.kuota * 100)) + '%"></i></div><div class="sm m">' + (sisa > 0 ? 'Sisa ' + sisa + ' dari ' + p.kuota + ' kursi' : 'Semua kursi terisi') + '</div>') +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:6px">' + st.chip + '<button class="btn o" data-a="detail-prog" data-x="' + p.id + '">Detail</button></div></div></div>';
  }
  function detailP(id) {
    var p = prog(id), st = statusP(p), act = '';
    if (st.state === 'menunggu') act = '<button class="btn o w" data-a="batal-daftar" data-x="' + id + '">Batalkan pendaftaran</button><p class="m sm" style="margin-top:8px;text-align:center">Pengurus akan mengonfirmasi pendaftaran Anda. Setelah disetujui, kelas muncul di halaman Kelas.</p>';
    else {
      if (st.state === 'ditolak') act += '<div class="note" style="background:var(--warn);color:var(--warnink)">Pendaftaran sebelumnya ditolak: ' + esc(st.alasan || '-') + '</div>';
      act += st.can ? '<button class="btn w" data-a="konfirm-daftar" data-x="' + id + '">' + (st.state === 'ditolak' ? 'Daftar lagi' : 'Daftar program ini') + '</button>' : '<button class="btn d w">' + (st.state === 'segera' ? 'Pendaftaran belum dibuka' : st.state === 'penuh' ? 'Kuota penuh' : 'Pendaftaran ditutup') + '</button>';
    }
    var mulai = p.sesi.length ? tgl(p.sesi[0].tanggal, 2) : 'Belum dijadwalkan';
    openSheet('<div class="gr"></div><div style="display:flex;gap:12px;align-items:center;margin-bottom:10px"><div class="pi ' + warna(p) + '">' + (IKON[p.kategori] || '&#128214;') + '</div><div><h2 style="margin:0">' + esc(p.nama) + '</h2><span class="chip">' + esc(p.kategori) + '</span></div></div><p class="m" style="font-size:13px;margin-bottom:10px">' + esc(p.desc) + '</p><dl><dt>Tujuan</dt><dd>' + esc(p.tujuan) + '</dd><dt>Jumlah sesi</dt><dd>' + p.sesi.length + ' sesi</dd><dt>Periode</dt><dd>' + esc(p.periode) + '</dd><dt>Mulai</dt><dd>' + mulai + '</dd><dt>Kuota</dt><dd>' + p.kuota + ' peserta (terisi ' + p.peserta.length + ')</dd></dl><div style="height:14px"></div>' + act);
  }
  function konfirmDaftar(id) {
    var p = prog(id);
    openSheet('<div class="gr"></div><h2>Daftar ke ' + esc(p.nama) + '?</h2><p class="m" style="font-size:13px">Pendaftaran akan dikirim ke pengurus untuk dikonfirmasi. Pastikan Anda bisa mengikuti seluruh ' + p.sesi.length + ' sesi.</p><label style="display:flex;gap:8px;align-items:flex-start;color:var(--ink);font-size:13px;margin:14px 0"><input type="checkbox" id="ck" style="margin-top:3px"> Saya bersedia mengikuti seluruh sesi.</label><div class="err" id="ce"></div><button class="btn w" data-a="kirim-daftar" data-x="' + id + '">Kirim pendaftaran</button><button class="btn o w" style="margin-top:8px;font-size:13px" data-a="detail-prog" data-x="' + id + '">Kembali</button>');
  }

  /* ---------- halaman dari menu ---------- */
  function pSel() {
    var m = mine(); if (m.length < 2) return '';
    return '<div class="sel2"><select data-a="pilih-prog">' + m.map(function (x) { return '<option value="' + x.id + '"' + (x.id === cp().id ? ' selected' : '') + '>' + esc(x.nama) + '</option>'; }).join('') + '</select></div>';
  }
  function kosong(t) { return '<h1 style="margin-bottom:12px">' + t + '</h1><div class="card"><p class="m sm">Anda belum tergabung di program mana pun.</p></div>'; }
  function rJadwal() {
    var p = cp(); if (!p) { $('jadwal').innerHTML = kosong('Jadwal Sesi'); return; }
    function rw(s, nx) { var h = s.hadir.indexOf(pid()) >= 0, past = s.tanggal < TODAY; var d = dt(s.tanggal); return '<div class="row" data-a="go" data-p="sesi" data-x="' + p.id + '" data-y="' + s.id + '" style="cursor:pointer"><div class="dt' + (past ? ' p' : '') + '">' + HARI[d.getDay()].toUpperCase() + '<i>' + d.getDate() + '</i>' + BULAN[d.getMonth()].toUpperCase() + '</div><div class="t">Sesi ' + s.no + ': ' + esc(s.judul) + '<small>' + (past ? '' : jamLabel(s) + ', ') + s.mode + ', ' + esc(s.tempat) + '</small></div>' + (h ? '<span class="dot ok">&#10003;</span>' : past ? '<span class="chip g">Belum tercatat</span>' : nx ? '<span class="chip">Berikutnya</span>' : '<span class="chip g">Akan datang</span>') + '</div>'; }
    var nx = nextSes(p), a = p.sesi.filter(function (s) { return s.tanggal < TODAY; }), b = p.sesi.filter(function (s) { return s.tanggal >= TODAY; });
    $('jadwal').innerHTML = '<h1 style="margin-bottom:12px">Jadwal Sesi</h1>' + pSel() + '<p class="m sm" style="margin:-4px 0 12px">' + esc(p.nama) + '</p>' + (a.length ? '<div class="card">' + a.map(function (s) { return rw(s, false); }).join('') + '</div>' : '') + (b.length ? '<div class="card" style="border-color:var(--t)">' + b.map(function (s) { return rw(s, nx && nx.id === s.id); }).join('') + '</div>' : '') + (p.sesi.length ? '' : '<div class="card"><p class="m sm">Belum ada sesi dijadwalkan.</p></div>');
  }
  function rSesi() {
    var p = prog(S.a1) || cp(), s = p && p.sesi.filter(function (x) { return x.id === S.a2; })[0];
    if (!p || !s) { go('jadwal', null, null, true); return; }
    $('sesi').innerHTML = '<button class="back" data-a="go" data-p="jadwal">&larr; Jadwal</button><div class="card"><span class="chip">Sesi #' + s.no + '</span><h1 style="margin-top:8px">' + esc(s.judul) + '</h1><dl style="margin-top:12px"><dt>Hari</dt><dd>' + tgl(s.tanggal, 2).replace(/^(\w+), /, '$1, ') + '</dd><dt>Jam</dt><dd>' + jamLabel(s) + ' WITA</dd><dt>Mode</dt><dd>' + s.mode + '</dd><dt>Lokasi</dt><dd>' + esc(s.tempat) + '</dd><dt>Program</dt><dd>' + esc(p.nama) + '</dd></dl></div><div class="card"><h2>Materi sesi</h2><div class="row"><div class="t">' + esc(s.judul) + '<small>' + (s.materi ? esc(s.materi.nama) : 'Belum tersedia') + '</small></div>' + (s.materi ? '<button class="btn o" data-a="unduh" data-n="' + esc(s.materi.nama) + '">Unduh</button>' : '<button class="btn d">Unduh</button>') + '</div></div>';
  }
  function rMateri() {
    var p = cp(); if (!p) { $('materi').innerHTML = kosong('Materi Pelatihan'); return; }
    $('materi').innerHTML = '<h1 style="margin-bottom:12px">Materi Pelatihan</h1>' + pSel() + '<p class="m sm" style="margin:-4px 0 12px">' + esc(p.nama) + '</p><div class="card">' + (p.sesi.map(function (s) { return '<div class="row"><div class="t">Sesi ' + s.no + ' : ' + esc(s.judul) + '<small>' + (s.materi ? esc(s.materi.nama) : 'Belum tersedia') + '</small></div>' + (s.materi ? '<button class="btn o" data-a="unduh" data-n="' + esc(s.materi.nama) + '">Unduh</button>' : '<button class="btn d">Unduh</button>') + '</div>'; }).join('') || '<p class="m sm">Belum ada sesi.</p>') + '</div>';
  }
  function rProgres() {
    var p = cp(); if (!p) { $('progres').innerHTML = kosong('Progres Anda'); return; }
    var id = pid();
    $('progres').innerHTML = '<h1 style="margin-bottom:12px">Progres Anda</h1>' + pSel() + '<div class="card"><div class="big">' + pct(p) + '%</div><div class="bar"><i style="width:' + pct(p) + '%"></i></div><div class="m sm">' + hadirN(p) + ' dari ' + p.sesi.length + ' sesi dihadiri</div><div style="margin-top:10px"><span class="chip ' + (selesai(p) ? '' : 'y') + '">' + (selesai(p) ? 'Selesai' : 'Sedang berjalan') + '</span></div></div><div class="card"><h2>Kehadiran per sesi</h2>' + (p.sesi.map(function (s) { var h = s.hadir.indexOf(id) >= 0; return '<div class="row"><span class="dot ' + (h ? 'ok' : 'no') + '">' + (h ? '&#10003;' : s.no) + '</span><div class="t">Sesi ' + s.no + ' : ' + esc(s.judul) + '<small>' + (h ? 'Hadir' : tgl(s.tanggal) + (s.tanggal < TODAY ? ', belum tercatat' : ', belum dimulai')) + '</small></div></div>'; }).join('') || '<p class="m sm">Belum ada sesi.</p>') + '</div><div class="card"><h2>Capaian program</h2><p class="m">' + esc(p.tujuan) + '</p></div>';
  }
  function rSert() {
    var p = cp(); if (!p) { $('sertifikat').innerHTML = kosong('Sertifikat'); return; }
    var u = user();
    if (selesai(p)) {
      $('sertifikat').innerHTML = '<h1 style="margin-bottom:12px">Sertifikat</h1>' + pSel() + '<div class="card"><span class="chip">Tersedia</span><div id="certArea"><div class="cert2"><small>Sertifikat penyelesaian</small><h2>Perempuan Kreatif Indonesia</h2><div class="sm m">diberikan kepada</div><div class="nm">' + esc(u.nama) + '</div><div class="sm m">atas keberhasilan menyelesaikan program</div><div style="font-weight:600;margin:6px 0;color:#0E4F55">' + esc(p.nama) + '</div><div class="sm m">' + esc(p.angkatan) + ' &middot; ' + tgl(TODAY, 2) + '</div></div></div><button class="btn w" data-a="cetak">Unduh sertifikat (PDF)</button><p class="m sm" style="margin-top:8px;text-align:center">Pilih "Simpan sebagai PDF" pada jendela cetak.</p></div>';
    } else {
      $('sertifikat').innerHTML = '<h1 style="margin-bottom:12px">Sertifikat</h1>' + pSel() + '<div class="card"><span class="chip y">&#9888; Belum tersedia</span><div class="cert">Pratinjau sertifikat<br>' + esc(p.nama) + '</div><p class="m sm" style="margin-bottom:12px">Sertifikat dapat diunduh setelah pengurus menandai Anda telah menyelesaikan program.</p><button class="btn d w" disabled>Unduh sertifikat (PDF)</button></div>';
    }
  }

  /* ---------- menu burger ---------- */
  function drawer(v) { var d = $('drawer'); if (v) rDrawer(); d.classList.toggle('on', !!v); $('scrim').classList.toggle('on', !!v); }
  function rDrawer() {
    var u = user(); if (!u) return;
    var wk = week();
    var days = wk.map(function (d, i) { return '<div class="' + (d === TODAY ? 'td ' : '') + (evOn(d).length ? 'ev' : '') + '">' + HARI[(i + 1) % 7] + '<b>' + dt(d).getDate() + '</b><i></i></div>'; }).join('');
    var evs = []; wk.forEach(function (d) { evOn(d).forEach(function (x) { evs.push({ d: d, x: x }); }); });
    var el = evs.map(function (e) { return '<div class="de" data-a="go" data-p="kdetail" data-x="' + e.x.p.id + '"><span class="tg">' + (e.d === TODAY ? 'Hari ini' : HARI[dt(e.d).getDay()] + ' ' + dt(e.d).getDate()) + '</span><span style="flex:1">' + esc(e.x.p.nama) + '<br><span style="opacity:.8;font-size:11.5px">Sesi ' + e.x.s.no + ' &middot; ' + jamLabel(e.x.s) + '</span></span></div>'; }).join('');
    function it(i, l, p) { return '<button class="dl' + (cur === p ? ' on' : '') + '" data-a="go" data-p="' + p + '">' + IC[i] + l + '</button>'; }
    $('drawer').innerHTML = '<div class="dh"><button class="x" data-a="tutup-menu" aria-label="Tutup menu">&times;</button><div class="av2"><svg width="44" height="44" viewBox="0 0 24 24" fill="#9AA"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.400 3.600-7 8-7s8 2.600 8 7z"/></svg></div><b>' + esc(u.nama) + '</b><small>' + esc(u.email) + '</small><span class="chip">Peserta aktif</span><button class="lo" data-a="keluar">Keluar</button></div>' +
      '<div class="ds"><h4>Jadwal kelas minggu ini</h4><div class="dw">' + days + '</div>' + (el || '<div class="de" style="opacity:.8">Tidak ada kelas minggu ini</div>') + '</div><div class="dsep"></div>' +
      '<div class="ds"><h4>Halaman</h4>' + it('home', 'Beranda', 'beranda') + it('kelas', 'Kelas', 'kelas') + it('cal', 'Jadwal', 'jadwal') + it('chart', 'Progres', 'progres') + it('cert', 'Sertifikat', 'sertifikat') + it('book', 'Materi', 'materi') + it('book', 'Program baru', 'program') + '</div><div class="dsep"></div>' +
      '<div class="ds"><h4>Pengaturan</h4><button class="dl" data-a="tg" data-x="notif">' + IC.bell + 'Notifikasi<span class="sw ' + (S.notif ? 'on' : '') + '"></span></button><button class="dl" data-a="tg" data-x="dark">' + IC.moon + 'Mode gelap<span class="sw ' + (S.dark ? 'on' : '') + '"></span></button><button class="dl" data-a="info" data-x="bahasa">' + IC.lang + 'Bahasa<span class="r">Indonesia</span></button></div><div class="dsep"></div>' +
      '<div class="ds"><h4>Bantuan</h4><button class="dl" data-a="info" data-x="pusat">' + IC.help + 'Pusat bantuan</button><button class="dl" data-a="info" data-x="faq">' + IC.help + 'FAQ</button><button class="dl" data-a="info" data-x="syarat">' + IC.doc + 'Syarat &amp; ketentuan</button><button class="dl" data-a="info" data-x="hubungi">' + IC.chat + 'Hubungi kami</button></div>' +
      '<div class="df"><div class="so"><span>Instagram</span><span>YouTube</span><span>WhatsApp</span></div>Versi 0.2 (prototype)<br>&copy; 2026 Perempuan Kreatif Indonesia<br>Politeknik Negeri Samarinda</div>';
  }
  function setPref() { writeJSON(PREF, { dark: S.dark, notif: S.notif }); document.documentElement.dataset.th = S.dark ? 'dark' : ''; }
  function info(k) {
    var T = {
      bahasa: ['Bahasa', '<p class="m" style="font-size:13px">Saat ini aplikasi tersedia dalam Bahasa Indonesia.</p>'],
      pusat: ['Pusat bantuan', '<div class="row"><div class="t">Cara masuk dan mengganti kata sandi</div></div><div class="row"><div class="t">Cara melihat jadwal dan mengunduh materi</div></div><div class="row"><div class="t">Cara mengumpulkan tugas</div></div><div class="row"><div class="t">Cara bergabung ke kelas</div></div>'],
      faq: ['Pertanyaan umum', '<div class="fq" data-a="faq"><b>Kapan sertifikat bisa diunduh?</b><p>Setelah pengurus menandai Anda telah menyelesaikan program.</p></div><div class="fq" data-a="faq"><b>Bagaimana progres dihitung?</b><p>Progres adalah persentase sesi yang Anda hadiri dari seluruh sesi program.</p></div><div class="fq" data-a="faq"><b>Kehadiran saya salah tercatat, bagaimana?</b><p>Hubungi fasilitator atau pengurus agar catatan kehadiran diperbaiki.</p></div><div class="fq" data-a="faq"><b>Apakah keluar dari halaman kelas menghapus keanggotaan?</b><p>Tidak. Anda hanya kembali ke daftar kelas.</p></div>'],
      syarat: ['Syarat &amp; ketentuan', '<p class="m" style="font-size:13px">Data Anda dipakai hanya untuk keperluan pelatihan PERI, seperti jadwal, kehadiran, tugas, progres, dan sertifikat. Jaga kerahasiaan kata sandi akun Anda. (Teks contoh pada prototype.)</p>'],
      hubungi: ['Hubungi kami', '<p class="m" style="font-size:13px;margin-bottom:12px">Ada kendala? Hubungi pengurus PERI.</p><button class="btn w" data-a="toast" data-n="Contoh: membuka WhatsApp pengurus">Chat WhatsApp pengurus</button><button class="btn o w" style="margin-top:8px;font-size:13px" data-a="toast" data-n="Contoh: membuka email">Kirim email</button>']
    };
    openSheet('<div class="gr"></div><h2>' + T[k][0] + '</h2>' + T[k][1]);
  }
  function openSheet(h) { $('sheetc').innerHTML = h; $('sheet').classList.add('on'); }
  function closeSheet() { $('sheet').classList.remove('on'); }

  /* ---------- aksi ---------- */
  var ACT = {
    'go': function (el) { var p = el.getAttribute('data-p'); go(p, el.getAttribute('data-x'), el.getAttribute('data-y')); var t = el.getAttribute('data-t'); if (t) { S.tab = t; rK(); } },
    'hari': function (el) { S.selDay = el.getAttribute('data-x'); rKelas(); },
    'tab': function (el) { S.tab = el.getAttribute('data-x'); S.tug = null; rK(); window.scrollTo(0, 0); },
    'keluar-kelas': function () { S.tug = null; go('kelas'); toast('Kembali ke daftar kelas. Keanggotaan Anda tidak berubah.'); },
    'buka-tugas': function (el) {
      var p = prog(S.a1), t = p.tugas.filter(function (x) { return x.id === el.getAttribute('data-x'); })[0];
      if (tStatus(p, t) === 'kunci') { toast('Tugas ini dibuka setelah sesinya berlangsung'); return; }
      S.tug = t.id; rK(); window.scrollTo(0, 0);
    },
    'semua-tugas': function () { S.tug = null; rK(); },
    'kumpul': function (el) {
      var p = prog(S.a1), id = el.getAttribute('data-x'), f = $('fl').files[0];
      if (!f) { $('te').textContent = 'Pilih berkas dulu sebelum mengumpulkan.'; return; }
      p.kumpul = p.kumpul || {}; p.kumpul[id] = p.kumpul[id] || {};
      var n = new Date(), z = function (x) { return x < 10 ? '0' + x : '' + x; };
      p.kumpul[id][pid()] = { file: f.name, at: TODAY + ' ' + z(n.getHours()) + ':' + z(n.getMinutes()), catatan: ($('cat').value || '').trim() };
      save(); S.tug = null; rK(); toast('Tugas dikumpulkan');
    },
    'batal-kumpul': function (el) { var p = prog(S.a1); delete p.kumpul[el.getAttribute('data-x')][pid()]; save(); rK(); toast('Pengiriman dibatalkan'); },
    'unduh': function (el) { toast('Prototype: ' + el.getAttribute('data-n') + ' akan terunduh pada versi akhir'); },
    'join': function () { S.jmsg = ''; S.jval = ''; rJoin(); },
    'join-tab': function (el) { S.joinTab = el.getAttribute('data-x'); S.jmsg = ''; S.jval = ''; rJoin(); },
    'join-kode': function () { joinKode($('jk').value); },
    'join-taut': function () { var u = $('jt').value, m = (u || '').match(/gabung\/([A-Za-z0-9-]+)/); S.jval = u; if (!m) { S.jmsg = 'Tautan tidak dikenali. Pastikan tautan lengkap.'; rJoin(); return; } joinKode(m[1]); },
    'terima-undang': function (el) { var u = db.undangan.filter(function (x) { return x.id === el.getAttribute('data-x'); })[0]; joinKode(u.kode); },
    'tolak-undang': function (el) { db.undangan.forEach(function (u) { if (u.id === el.getAttribute('data-x')) u.status = 'ditolak'; }); save(); rJoin(); toast('Undangan ditolak'); },
    'kat': function (el) { S.cat = el.getAttribute('data-x'); rProgram(); },
    'fav': function (el) { var id = pid(), k = el.getAttribute('data-x'), f = readJSON(FAV + '_' + id, {}); f[k] = !f[k]; writeJSON(FAV + '_' + id, f); rProgram(); toast(f[k] ? 'Disimpan ke minat Anda' : 'Dihapus dari minat'); },
    'detail-prog': function (el) { detailP(el.getAttribute('data-x')); },
    'konfirm-daftar': function (el) { konfirmDaftar(el.getAttribute('data-x')); },
    'kirim-daftar': function (el) {
      if (!$('ck').checked) { $('ce').textContent = 'Centang dulu pernyataan di atas.'; return; }
      var id = el.getAttribute('data-x');
      db.pendaftaran.push({ id: 'r' + Date.now().toString(36), pid: pid(), prog: id, tgl: TODAY, status: 'menunggu', alasan: '' });
      save(); closeSheet(); rProgram(); toast('Pendaftaran dikirim, menunggu konfirmasi pengurus');
    },
    'batal-daftar': function (el) {
      var id = el.getAttribute('data-x');
      db.pendaftaran = db.pendaftaran.filter(function (r) { return !(r.pid === pid() && r.prog === id && r.status === 'menunggu'); });
      save(); closeSheet(); rProgram(); toast('Pendaftaran dibatalkan');
    },
    'pilih-prog': function (el) { S.prog = el.value; show(cur); },
    'cetak': function () { window.print(); },
    'tutup-menu': function () { drawer(0); },
    'keluar': keluar,
    'tg': function (el) { var k = el.getAttribute('data-x'); S[k] = !S[k]; setPref(); rDrawer(); toast(k === 'notif' ? (S.notif ? 'Notifikasi diaktifkan' : 'Notifikasi dimatikan') : (S.dark ? 'Mode gelap aktif' : 'Mode terang aktif')); },
    'info': function (el) { drawer(0); info(el.getAttribute('data-x')); },
    'faq': function (el) { el.classList.toggle('on'); },
    'toast': function (el) { toast(el.getAttribute('data-n')); }
  };
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-a]'); if (!el || el.tagName === 'SELECT') return;
    var f = ACT[el.getAttribute('data-a')]; if (f) f(el);
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.getAttribute && el.getAttribute('data-a') === 'pilih-prog') { ACT['pilih-prog'](el); return; }
    if (el.id === 'fl') { $('fln').innerHTML = '&#128206; ' + esc(el.files[0] ? el.files[0].name : 'Pilih berkas'); }
  });
  document.addEventListener('input', function (e) {
    if (e.target.id === 'cari') { S.q = e.target.value; var pos = e.target.selectionStart; rProgram(); var i = $('cari'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } }
  });
  document.addEventListener('submit', function (e) { var f = e.target; if (f.getAttribute('data-form') === 'login') { e.preventDefault(); doLogin(f); } });
  window.addEventListener('popstate', function () { var r = parse(); S.a1 = r.a || null; S.a2 = r.b || null; show(r.p || 'beranda'); });
  window.addEventListener('storage', function (e) {
    if (e.key !== Store.KEY || !pid() || cur === 'login') return;
    var a = document.activeElement;
    if ($('sheet').classList.contains('on') || (a && /INPUT|TEXTAREA/.test(a.tagName)) || S.tug) { db = Store.load(); return; }
    var y = window.scrollY; show(cur); window.scrollTo(0, y);
  });

  var pf = readJSON(PREF, {}); S.dark = !!pf.dark; S.notif = pf.notif !== false; document.documentElement.dataset.th = S.dark ? 'dark' : '';
  window.PS = { go: go, drawer: drawer, openJoin: function () { S.jmsg = ''; S.jval = ''; rJoin(); }, closeSheet: closeSheet, keluar: keluar };
  var r0 = parse(); S.a1 = r0.a || null; S.a2 = r0.b || null;
  show(pid() ? (r0.p || 'beranda') : 'login');
})();