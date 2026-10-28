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
  const topId = sorted[0] ? sorted[0].id : null;
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

// ---------- Dashboard ----------

async function initDashboard() {
  const elPendaftar = document.getElementById("stat-pendaftar");
  const elProgram = document.getElementById("stat-program");
  const elPesan = document.getElementById("stat-pesan");
  await muatPesanApi();
  if (elPendaftar) elPendaftar.textContent = registrants.length;
  if (elProgram) elProgram.textContent = programs.length;
  if (elPesan) elPesan.textContent = guestbook.filter((g) => !g.dibaca).length;
  renderKinerjaTable("kinerja-body", false);
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

function initKelolaProgram() {
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
  const program = getProgramById(r.programId);
  return `
    <tr>
      <td>
        <div class="name-cell">
          <span>${r.nama}</span>
          ${r.duplikat ? '<span class="badge badge-warn">Duplikat</span>' : '<span class="badge badge-muted">Terverifikasi</span>'}
        </div>
      </td>
      <td>${r.email}</td>
      <td>${r.wa}</td>
      <td>${program ? program.nama : "-"}</td>
      <td>${formatTanggal(r.tanggal)}</td>
    </tr>`;
}

function currentFilteredRegistrants() {
  const programId = document.getElementById("filter-program").value;
  const query = document
    .getElementById("search-pendaftar")
    .value.trim()
    .toLowerCase();
  return registrants.filter((r) => {
    const matchProgram =
      programId === "all" || r.programId === Number(programId);
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
    body.innerHTML = `<tr><td colspan="5"><div class="empty">Tidak ada pendaftar yang cocok dengan pencarian ini.</div></td></tr>`;
    return;
  }
  body.innerHTML = rows.map(registrantRowHtml).join("");
}

function populateProgramFilter() {
  const select = document.getElementById("filter-program");
  const options = programs
    .map((p) => `<option value="${p.id}">${p.nama}</option>`)
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
  ];
  const lines = rows.map((r) => {
    const program = getProgramById(r.programId);
    const status = r.duplikat ? "Duplikat" : "Terverifikasi";
    return [
      r.nama,
      r.email,
      r.wa,
      program ? program.nama : "-",
      formatTanggal(r.tanggal),
      status,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
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

function initPendaftar() {
  populateProgramFilter();
  renderRegistrantTable();
  document
    .getElementById("filter-program")
    .addEventListener("change", renderRegistrantTable);
  document
    .getElementById("search-pendaftar")
    .addEventListener("input", renderRegistrantTable);
  document.getElementById("btn-ekspor").addEventListener("click", exportCsv);
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

function initKinerjaProgram() {
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
