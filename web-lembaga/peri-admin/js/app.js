const BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function formatTanggal(iso) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function getProgramById(id) {
  return programs.find((p) => p.id === id);
}

function showToast(pesan) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = pesan;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

// ---------- Kinerja program (dipakai di dashboard & kinerja-program.html) ----------

function kinerjaRowHtml(program, rank, topId) {
  const isTop = program.id === topId;
  const rankCell = rank
    ? `<td style="color:var(--text-muted);">${rank}</td>`
    : "";
  return `
    <tr>
      ${rankCell}
      <td>
        <div class="name-cell">
          <span>${program.nama}</span>
          ${isTop ? '<span class="badge">Terbanyak</span>' : ""}
        </div>
      </td>
      <td>${program.pendaftar}</td>
      <td>
        <div class="progress-wrap">
          <div class="progress"><span class="progress-fill" style="width:${program.penyelesaian}%"></span></div>
          <span style="font-size:12px;color:var(--text-secondary);width:32px;text-align:right;">${program.penyelesaian}%</span>
        </div>
      </td>
      <td>${program.kepuasan.toFixed(1)}</td>
    </tr>`;
}

function renderKinerjaTable(bodyId, withRank) {
  const body = document.getElementById(bodyId);
  if (!body) return;
  const sorted = [...programs].sort((a, b) => b.pendaftar - a.pendaftar);
  // Lencana "Terbanyak" hanya untuk program yang benar-benar sudah punya pendaftar.
  const topId = sorted[0] && sorted[0].pendaftar > 0 ? sorted[0].id : null;
  body.innerHTML = sorted
    .map((p, i) => kinerjaRowHtml(p, withRank ? i + 1 : null, topId))
    .join("");
}

// ---------- Pesan dari form Umpan Balik (API peri-auth) ----------

const API_BASE = "http://" + (location.hostname || "127.0.0.1") + ":5001";
let pesanApiAktif = false;

// Ambil pesan yang dikirim pengunjung lewat web lembaga dan taruh di atas data contoh.
async function muatPesanApi() {
  try {
    const r = await fetch(API_BASE + "/api/buku-tamu", {
      credentials: "include",
    });
    if (!r.ok) throw new Error("API " + r.status);
    const { pesan } = await r.json();
    for (let i = guestbook.length - 1; i >= 0; i--)
      if (guestbook[i]._api) guestbook.splice(i, 1);
    guestbook.unshift(
      ...pesan.map((p) => ({
        id: "api-" + p.id,
        _api: true,
        _dbId: p.id,
        nama: p.nama,
        email: p.email,
        wa: "",
        pesan: p.pesan,
        _kat: p.kategori ? { kategori: p.kategori, skor: p.skor } : null,
        tanggal: p.tanggal,
        dibaca: p.dibaca,
      })),
    );
    pesanApiAktif = true;
  } catch (e) {
    pesanApiAktif = false;
  }
}

// ---------- Pendaftar program (API peri-backend) ----------

let pendaftarApiAktif = false;

// Ambil pendaftar asli dari database. Gagal (server mati / bukan admin) -> daftar dikosongkan.
async function muatPendaftarApi() {
  try {
    const r = await fetch(API_BASE + "/api/pendaftaran-program", {
      credentials: "include",
    });
    if (!r.ok) throw new Error("API " + r.status);
    const { pendaftar } = await r.json();
    registrants = pendaftar.map((p) => ({
      id: "api-" + p.id,
      nama: p.nama,
      email: p.email,
      wa: p.wa,
      program: p.program,
      tanggal: p.tanggal,
      status: p.status,
      apiId: p.id,
      duplikat: false,
    }));
    pendaftarApiAktif = true;
  } catch (e) {
    registrants = [];
    pendaftarApiAktif = false;
  }
  hitungPendaftar();
}

// Jumlah pendaftar setiap program dihitung dari data pendaftaran asli.
function hitungPendaftar() {
  programs.forEach((p) => {
    p.pendaftar = registrants.filter((r) => r.program === p.nama).length;
  });
}

// ---------- Dashboard ----------

const BULAN_PENDEK = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const BULAN_PANJANG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const IKON_PANAH =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="%P%"/></svg>';

function setTeks(id, teks) {
  const el = document.getElementById(id);
  if (el) el.textContent = teks;
}

function setLencana(id, jumlah) {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = !(jumlah > 0);
  el.textContent = jumlah > 99 ? "99+" : String(jumlah);
}

// Kartu "Perlu tindakan" dan lencana di menu sidebar.
function renderTindakan() {
  // 1. Pendaftar yang belum diterima admin
  if (pendaftarApiAktif) {
    const menunggu = registrants.filter((r) => r.status !== "diterima");
    setTeks("aksi-pendaftar-n", menunggu.length);
    setLencana("nav-pendaftar", menunggu.length);
    if (menunggu.length === 0) {
      setTeks("aksi-pendaftar-hint", "Semua pendaftar sudah dikonfirmasi");
    } else {
      const tertua = menunggu.map((r) => r.tanggal).sort()[0];
      const hariIni = new Date();
      hariIni.setHours(0, 0, 0, 0);
      const hari = Math.floor(
        (hariIni - new Date(tertua + "T00:00:00")) / 86400000,
      );
      setTeks(
        "aksi-pendaftar-hint",
        hari <= 0
          ? "Paling lama masuk hari ini"
          : `Paling lama sudah ${hari} hari`,
      );
    }
  } else {
    setTeks("aksi-pendaftar-n", "–");
    setTeks("aksi-pendaftar-hint", "Data pendaftar belum bisa dimuat");
  }

  // 2. Umpan balik yang belum dibaca
  const belum = guestbook.filter((g) => !g.dibaca);
  setTeks("aksi-pesan-n", belum.length);
  setLencana("nav-buku-tamu", belum.length);
  if (belum.length === 0) {
    setTeks("aksi-pesan-hint", "Semua umpan balik sudah dibaca");
  } else {
    const tanya = belum.filter((g) => kategoriOf(g) === "pertanyaan").length;
    setTeks(
      "aksi-pesan-hint",
      tanya > 0
        ? `${tanya} di antaranya pertanyaan program`
        : modelAktif
          ? "Belum ada pertanyaan program"
          : "Kategori belum dianalisis",
    );
  }

  // 3. Program yang belum punya pendaftar
  if (pendaftarApiAktif) {
    const kosong = programs.filter((p) => p.pendaftar === 0).map((p) => p.nama);
    setTeks("aksi-program-n", kosong.length);
    setTeks(
      "aksi-program-hint",
      kosong.length === 0
        ? "Semua program sudah punya pendaftar"
        : kosong.length <= 2
          ? kosong.join(" dan ")
          : `${kosong.slice(0, 2).join(", ")} dan ${kosong.length - 2} lainnya`,
    );
  } else {
    setTeks("aksi-program-n", "–");
    setTeks("aksi-program-hint", "Data pendaftar belum bisa dimuat");
  }
}

// Tren pendaftar 6 bulan terakhir, dihitung dari tanggal pendaftaran asli.
function renderTren() {
  const wadah = document.getElementById("tren-isi");
  if (!wadah) return;
  if (!pendaftarApiAktif) {
    wadah.innerHTML =
      '<p class="empty-note">Data pendaftar belum bisa dimuat. Pastikan peri-backend berjalan dan Anda masuk sebagai admin.</p>';
    return;
  }
  const sekarang = new Date();
  const bulan = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(sekarang.getFullYear(), sekarang.getMonth() - i, 1);
    const kunci =
      d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    bulan.push({
      kunci,
      nama: BULAN_PENDEK[d.getMonth()],
      panjang: BULAN_PANJANG[d.getMonth()],
      jumlah: registrants.filter((r) => (r.tanggal || "").slice(0, 7) === kunci)
        .length,
    });
  }
  const ini = bulan[5];
  const lalu = bulan[4];
  const maks = Math.max(1, ...bulan.map((b) => b.jumlah));

  let delta = "";
  if (lalu.jumlah > 0) {
    const persen = Math.round(((ini.jumlah - lalu.jumlah) / lalu.jumlah) * 100);
    const arah = persen > 0 ? "up" : persen < 0 ? "down" : "flat";
    const panah =
      arah === "up"
        ? IKON_PANAH.replace("%P%", "M12 19V5M5 12l7-7 7 7")
        : arah === "down"
          ? IKON_PANAH.replace("%P%", "M12 5v14M19 12l-7 7-7-7")
          : "";
    delta = `<div class="trend-stat trend-stat-delta"><span class="delta ${arah}">${panah}${Math.abs(persen)}%</span><span>dibanding ${lalu.panjang}</span></div>`;
  } else {
    delta = `<div class="trend-stat trend-stat-delta"><span class="delta flat">–</span><span>belum ada data ${lalu.panjang}</span></div>`;
  }

  const batang = bulan
    .map((b, i) => {
      const tinggi =
        b.jumlah === 0 ? 4 : Math.max(8, Math.round((b.jumlah / maks) * 150));
      return `<div class="bar-col${i === 5 ? " now" : ""}">
          <span class="bar-val">${b.jumlah}</span>
          <div class="bar" style="height:${tinggi}px" role="img" aria-label="${b.panjang}: ${b.jumlah} pendaftar"></div>
          <span class="bar-mon">${b.nama}</span>
        </div>`;
    })
    .join("");

  wadah.innerHTML = `
    <div class="trend-stats">
      <div class="trend-stat"><b>${ini.jumlah}</b><span>Pendaftar bulan ini</span></div>
      ${delta}
      <div class="trend-stat"><b>${registrants.length}</b><span>Total semua pendaftar</span></div>
    </div>
    <div class="bars">${batang}</div>`;
}

// Ringkasan topik umpan balik (hasil klasifikasi NLP yang sama dengan halaman Buku tamu).
function renderTopik() {
  const wadah = document.getElementById("topik-isi");
  if (!wadah) return;
  if (guestbook.length === 0) {
    wadah.innerHTML = '<p class="empty-note">Belum ada umpan balik.</p>';
    return;
  }
  const hitung = {};
  let belumDianalisis = 0;
  guestbook.forEach((g) => {
    const k = kategoriOf(g);
    if (!k) belumDianalisis++;
    else hitung[k] = (hitung[k] || 0) + 1;
  });
  const daftar = Object.keys(hitung)
    .map((k) => ({ k, n: hitung[k] }))
    .sort((a, b) => b.n - a.n);
  const terkelompok = guestbook.length - belumDianalisis;
  if (daftar.length === 0) {
    wadah.innerHTML =
      '<p class="empty-note">Kategori belum tersedia. Jalankan python api.py agar pesan dikelompokkan otomatis.</p>';
    return;
  }
  const maks = daftar[0].n;
  const baris = daftar
    .map(
      (d, i) => `<div class="topic-item${i === 0 ? " top" : ""}">
        <div class="topic-row"><span>${esc(KATEGORI_LABEL[d.k] || "Lainnya")}</span><b>${d.n}</b></div>
        <div class="track"><i style="width:${Math.round((d.n / maks) * 100)}%"></i></div>
      </div>`,
    )
    .join("");
  wadah.innerHTML = `<div class="topic-list">${baris}</div>
    <p class="topic-note">${terkelompok} pesan terkelompok${belumDianalisis ? ` · ${belumDianalisis} belum dianalisis` : ""}</p>`;
}

async function initDashboard() {
  setTeks(
    "dash-tanggal",
    "Ringkasan aktivitas PERI per " +
      new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
  );
  await Promise.all([muatPesanApi(), muatPendaftarApi()]);
  renderTindakan();
  renderTren();
  renderTopik();
  // Pengelompokan NLP bisa lambat / server mati: tampilkan dulu yang sudah ada, perbarui setelahnya.
  await muatKategoriModel();
  renderTindakan();
  renderTopik();
}

// ---------- Kelola Program ----------

let editingProgramId = null;

function programRowHtml(p) {
  return `
    <tr data-id="${p.id}">
      <td>${p.nama}</td>
      <td>${p.tujuan}</td>
      <td>${p.periode}</td>
      <td>${p.pendaftar}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-sm btn-edit" data-id="${p.id}">Ubah</button>
          <button class="btn btn-sm btn-danger btn-delete" data-id="${p.id}">Hapus</button>
        </div>
      </td>
    </tr>`;
}

function renderProgramTable() {
  const body = document.getElementById("program-body");
  if (!body) return;
  if (programs.length === 0) {
    body.innerHTML = `<tr><td colspan="5"><div class="empty">Belum ada program. Klik "Tambah program" untuk menambahkan.</div></td></tr>`;
    return;
  }
  body.innerHTML = programs.map(programRowHtml).join("");
  body
    .querySelectorAll(".btn-edit")
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        openProgramModal(Number(btn.dataset.id)),
      ),
    );
  body
    .querySelectorAll(".btn-delete")
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        deleteProgram(Number(btn.dataset.id)),
      ),
    );
}

function openProgramModal(id) {
  editingProgramId = id || null;
  const modal = document.getElementById("program-modal");
  const title = document.getElementById("program-modal-title");
  const nama = document.getElementById("input-nama");
  const tujuan = document.getElementById("input-tujuan");
  const periode = document.getElementById("input-periode");
  const error = document.getElementById("program-error");
  error.classList.remove("show");

  if (id) {
    const p = getProgramById(id);
    title.textContent = "Ubah program";
    nama.value = p.nama;
    tujuan.value = p.tujuan;
    periode.value = p.periode;
  } else {
    title.textContent = "Tambah program";
    nama.value = "";
    tujuan.value = "";
    periode.value = "Bulanan";
  }
  modal.classList.add("open");
  nama.focus();
}

function closeProgramModal() {
  document.getElementById("program-modal").classList.remove("open");
}

function saveProgram() {
  const nama = document.getElementById("input-nama").value.trim();
  const tujuan = document.getElementById("input-tujuan").value.trim();
  const periode = document.getElementById("input-periode").value;
  const error = document.getElementById("program-error");

  if (!nama || !tujuan) {
    error.textContent = "Nama program dan tujuan wajib diisi.";
    error.classList.add("show");
    return;
  }

  if (editingProgramId) {
    const p = getProgramById(editingProgramId);
    p.nama = nama;
    p.tujuan = tujuan;
    p.periode = periode;
    showToast("Program diperbarui");
  } else {
    const newId = programs.length
      ? Math.max(...programs.map((p) => p.id)) + 1
      : 1;
    programs.push({
      id: newId,
      nama,
      tujuan,
      periode,
      pendaftar: 0,
      penyelesaian: 0,
      kepuasan: 0,
    });
    showToast("Program ditambahkan");
  }
  closeProgramModal();
  renderProgramTable();
}

function deleteProgram(id) {
  const p = getProgramById(id);
  if (
    !confirm(
      `Hapus program "${p.nama}"? Data pendaftar pada program ini tidak akan ikut terhapus.`,
    )
  )
    return;
  programs = programs.filter((p) => p.id !== id);
  renderProgramTable();
  showToast("Program dihapus");
}

async function initKelolaProgram() {
  await muatPendaftarApi();
  renderProgramTable();
  document
    .getElementById("btn-tambah-program")
    .addEventListener("click", () => openProgramModal(null));
  document
    .getElementById("btn-batal-program")
    .addEventListener("click", closeProgramModal);
  document
    .getElementById("btn-simpan-program")
    .addEventListener("click", saveProgram);
  document.getElementById("program-modal").addEventListener("click", (e) => {
    if (e.target.id === "program-modal") closeProgramModal();
  });
}

// ---------- Pendaftar ----------

function registrantRowHtml(r) {
  return `
    <tr>
      <td>
        <div class="name-cell">
          <span>${esc(r.nama)}</span>
          ${r.duplikat ? '<span class="badge badge-warn">Duplikat</span>' : '<span class="badge badge-muted">Terverifikasi</span>'}
        </div>
      </td>
      <td>${esc(r.email)}</td>
      <td>${esc(r.wa)}</td>
      <td>${esc(r.program)}</td>
      <td>${formatTanggal(r.tanggal)}</td>
      <td>${konfirmasiHtml(r)}</td>
    </tr>`;
}

// Kolom konfirmasi: tombol "Terima" untuk pendaftar baru, lencana "Diterima" (bisa dibatalkan) bila sudah diterima.
function konfirmasiHtml(r) {
  if (r.status === "diterima") {
    return `<div class="row-actions" style="align-items: center">
        <span class="badge badge-ok">Diterima</span>
        <button class="btn btn-sm btn-ghost btn-batal-terima" data-id="${esc(r.id)}">Batalkan</button>
      </div>`;
  }
  return `<button class="btn btn-sm btn-primary btn-terima" data-id="${esc(r.id)}">Terima</button>`;
}

async function ubahKonfirmasi(id, diterima, tombol) {
  const r = registrants.find((x) => x.id === id);
  if (!r) return;
  tombol.disabled = true;
  try {
    const res = await fetch(
      API_BASE + "/api/pendaftaran-program/" + r.apiId + "/konfirmasi",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diterima }),
      },
    );
    if (!res.ok) throw new Error("API " + res.status);
    r.status = diterima ? "diterima" : "baru";
    renderRegistrantTable();
    showToast(
      diterima
        ? `${r.nama} diterima di ${r.program}`
        : `Penerimaan ${r.nama} dibatalkan`,
    );
  } catch (e) {
    tombol.disabled = false;
    showToast(
      "Gagal menyimpan konfirmasi. Pastikan peri-backend berjalan dan Anda masuk sebagai admin.",
    );
  }
}

function currentFilteredRegistrants() {
  const programNama = document.getElementById("filter-program").value;
  const query = document
    .getElementById("search-pendaftar")
    .value.trim()
    .toLowerCase();
  return registrants.filter((r) => {
    const matchProgram = programNama === "all" || r.program === programNama;
    const haystack = `${r.nama} ${r.email} ${r.wa}`.toLowerCase();
    const matchSearch = !query || haystack.includes(query);
    return matchProgram && matchSearch;
  });
}

function renderRegistrantTable() {
  const body = document.getElementById("pendaftar-body");
  if (!body) return;
  const rows = currentFilteredRegistrants();
  if (rows.length === 0) {
    const pesan = !pendaftarApiAktif
      ? "Data pendaftar belum bisa dimuat. Pastikan peri-backend berjalan (python app.py) dan Anda masuk sebagai admin."
      : registrants.length === 0
        ? "Belum ada pendaftar."
        : "Tidak ada pendaftar yang cocok dengan pencarian ini.";
    body.innerHTML = `<tr><td colspan="6"><div class="empty">${pesan}</div></td></tr>`;
    return;
  }
  body.innerHTML = rows.map(registrantRowHtml).join("");
}

function populateProgramFilter() {
  const select = document.getElementById("filter-program");
  const options = programs
    .map((p) => `<option value="${esc(p.nama)}">${esc(p.nama)}</option>`)
    .join("");
  select.innerHTML = `<option value="all">Semua program</option>${options}`;
}

function exportCsv() {
  const rows = currentFilteredRegistrants();
  if (rows.length === 0) {
    showToast("Tidak ada data untuk diekspor");
    return;
  }
  const header = [
    "Nama",
    "Email",
    "No. WhatsApp",
    "Program",
    "Tanggal daftar",
    "Status",
    "Konfirmasi",
  ];
  const lines = rows.map((r) => {
    const status = r.duplikat ? "Duplikat" : "Terverifikasi";
    return (
      [
        r.nama,
        r.email,
        r.wa,
        r.program,
        formatTanggal(r.tanggal),
        status,
        r.status === "diterima" ? "Diterima" : "Menunggu",
      ]
        // Awalan ' mencegah isian seperti "=1+1" dibaca sebagai rumus saat CSV dibuka di Excel.
        .map((v) => (/^[=+\-@]/.test(String(v)) ? "'" + v : v))
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
  });
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data-pendaftar-peri.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Data pendaftar diekspor ke CSV");
}

async function initPendaftar() {
  populateProgramFilter();
  await muatPendaftarApi();
  renderRegistrantTable();
  document
    .getElementById("filter-program")
    .addEventListener("change", renderRegistrantTable);
  document
    .getElementById("search-pendaftar")
    .addEventListener("input", renderRegistrantTable);
  document.getElementById("btn-ekspor").addEventListener("click", exportCsv);
  document.getElementById("pendaftar-body").addEventListener("click", (e) => {
    const terima = e.target.closest(".btn-terima");
    const batal = e.target.closest(".btn-batal-terima");
    if (terima) ubahKonfirmasi(terima.dataset.id, true, terima);
    else if (batal) ubahKonfirmasi(batal.dataset.id, false, batal);
  });
}

// ---------- Buku Tamu ----------

const KATEGORI_LABEL = {
  saran: "Saran",
  kritik: "Kritik",
  pertanyaan: "Pertanyaan Program",
  kerjasama: "Kerja Sama & Kolaborasi",
  lainnya: "Lainnya",
};
function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

// ----- Kategori otomatis (NLP) -----
// Kategori setiap pesan ditentukan oleh model klasifikasi lewat API Python (jalankan: python api.py, port 5000).
const API_KATEGORI = "http://127.0.0.1:5000/api/kategori";
let modelAktif = false;

function kategoriOf(g) {
  return g._kat ? g._kat.kategori : null;
}

async function muatKategoriModel() {
  // Pesan dari form sudah dikategorikan server saat dikirim; sisanya (data contoh) dikategorikan di sini.
  const target = guestbook.filter((g) => !g._kat);
  if (target.length === 0) {
    modelAktif = true;
    return;
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch(API_KATEGORI, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pesan: target.map((g) => g.pesan) }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) throw new Error("API " + r.status);
    const { hasil } = await r.json();
    target.forEach((g, i) => {
      g._kat = { kategori: hasil[i].kategori, skor: hasil[i].skor };
    });
    modelAktif = true;
  } catch (e) {
    modelAktif = false;
  }
}

const gbFilter = { q: "", kategori: "" };

function kategoriTagHtml(g) {
  const k = kategoriOf(g);
  if (!k)
    return `<span class="tag" title="Jalankan python api.py agar kategori ditentukan otomatis">Belum dianalisis</span>`;
  return `<span class="tag" title="Ditentukan model, keyakinan: ${g._kat.skor}">${esc(KATEGORI_LABEL[k] || "Lainnya")}</span>`;
}

function guestbookItemHtml(g) {
  return `
    <div class="gb-item" data-id="${g.id}">
      <div class="gb-top">
        <span class="gb-name">${esc(g.nama)}</span>
        <span class="gb-meta">${formatTanggal(g.tanggal)}</span>
      </div>
      <p class="gb-message">${esc(g.pesan)}</p>
      <div class="gb-tags">
        ${kategoriTagHtml(g)}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span class="gb-meta">${[g.email !== "-" ? esc(g.email) : "", esc(g.wa)].filter(Boolean).join(" · ")}</span>
        <button class="btn btn-sm btn-toggle-baca" data-id="${g.id}">
          ${g.dibaca ? "Tandai belum dibaca" : "Tandai sudah dibaca"}
        </button>
      </div>
    </div>`;
}

function gbFiltered() {
  const q = gbFilter.q.trim().toLowerCase();
  return guestbook.filter((g) => {
    if (q && !(g.nama + " " + g.pesan).toLowerCase().includes(q)) return false;
    if (gbFilter.kategori && kategoriOf(g) !== gbFilter.kategori) return false;
    return true;
  });
}

function renderGuestbook() {
  const list = document.getElementById("guestbook-list");
  if (!list) return;
  if (guestbook.length === 0) {
    list.innerHTML = `<div class="empty">Belum ada masukan dari pengunjung.</div>`;
    return;
  }
  const rows = gbFiltered();
  const cnt = document.getElementById("gb-count");
  if (cnt)
    cnt.textContent = `${rows.length} dari ${guestbook.length} pesan · kategori otomatis: ${modelAktif ? "model aktif" : "model belum aktif"}`;
  if (rows.length === 0) {
    list.innerHTML = `<div class="empty">Tidak ada pesan yang cocok dengan filter.</div>`;
    return;
  }
  const sorted = [...rows].sort((a, b) =>
    a.dibaca === b.dibaca ? 0 : a.dibaca ? 1 : -1,
  );
  list.innerHTML = sorted.map(guestbookItemHtml).join("");
  list.querySelectorAll(".btn-toggle-baca").forEach((btn) => {
    btn.addEventListener("click", () => {
      const g = guestbook.find((g) => String(g.id) === btn.dataset.id);
      g.dibaca = !g.dibaca;
      if (g._api) {
        fetch(`${API_BASE}/api/buku-tamu/${g._dbId}/dibaca`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dibaca: g.dibaca }),
        }).catch(() => showToast("Status dibaca belum tersimpan ke server."));
      }
      renderGuestbook();
      updateGuestbookCount();
    });
  });
}

function updateGuestbookCount() {
  const el = document.getElementById("stat-belum-dibaca");
  if (el) el.textContent = guestbook.filter((g) => !g.dibaca).length;
}

async function initBukuTamu() {
  document.getElementById("gb-search").addEventListener("input", (e) => {
    gbFilter.q = e.target.value;
    renderGuestbook();
  });
  document.getElementById("gb-f-kategori").addEventListener("change", (e) => {
    gbFilter.kategori = e.target.value;
    renderGuestbook();
  });
  await muatPesanApi();
  await muatKategoriModel();
  renderGuestbook();
  updateGuestbookCount();
}

// ---------- Kinerja Program (halaman detail) ----------

async function initKinerjaProgram() {
  await muatPendaftarApi();
  renderKinerjaTable("kinerja-full-body", true);
}

// ---------- Dispatcher ----------

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "dashboard") initDashboard();
  if (page === "kelola-program") initKelolaProgram();
  if (page === "pendaftar") initPendaftar();
  if (page === "buku-tamu") initBukuTamu();
  if (page === "kinerja-program") initKinerjaProgram();
});
