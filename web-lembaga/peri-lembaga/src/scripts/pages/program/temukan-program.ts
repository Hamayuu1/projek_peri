/* =========================================================
   Wizard "Temukan Program Anda" (3 langkah + hasil).
   Dibuka oleh tombol [data-temukan-program] di halaman Program.
   Rekomendasi dihitung di browser dengan aturan skor sederhana
   (tabel di bawah), dari program yang ada di halaman.
   Desain: Figma node 166:371 (Profil), 167:263 (Preferensi), 168:536 (Tujuan).
   ========================================================= */
import type { ProgramInfo } from "../../types";
import { esc } from "../../utils/html";
import { keDaftarProgram, semuaProgram } from "./katalog";

type Bobot = Record<string, number>;
type PetaSkor = Record<string, Bobot>;
type JenisOpsi = "kerja" | "ekonomi" | "topik" | "tujuan";

interface Alasan {
  topik: string[];
  tujuan: string[];
  profil: boolean;
}
interface Jawaban {
  step: number; // 1-3 = formulir, 4 = hasil
  usia: string;
  kerja: string;
  ekonomi: string;
  topik: string[];
  tujuan: string[];
}
interface Rekomendasi {
  p: ProgramInfo;
  skor: number;
  i: number;
  alasan: Alasan | undefined;
  persen: number;
}

/* ---------- Pilihan formulir ---------- */
const KERJA = [
  "Pelajar/Mahasiswa",
  "Ibu rumah tangga",
  "Karyawan",
  "Wirausaha",
  "Belum bekerja",
  "Lainnya",
];
const EKONOMI = ["Kurang mampu", "Menengah", "Mapan"];
const TOPIK = [
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
const TUJUAN = [
  "Memulihkan diri dan menjaga kesehatan",
  "Mencapai kemandirian ekonomi",
  "Menambah keterampilan",
  "Memperluas jejaring",
  "Mendapat akses permodalan",
  "Bantuan pendidikan untuk anak",
  "Mempromosikan hasil karya",
];

/* ---------- Tabel skor: pilihan -> {program: bobot} ---------- */
const BANGKIT = "Bangkit dan Berdaya";
const INKUBATOR = "Inkubator Bisnis Perempuan";
const KREASI = "Kelas Kreasi Mandiri";
const DIGITAL = "Digital Skill Academy";
const RUANG = "Ruang Temu & Kolaborasi";
const SEHAT = "Perempuan Sehat & Bahagia";
const BEASISWA = "Beasiswa Kreatifitas Anak Perempuan";
const PODCAST = "Podcast Suara Perempuan";
const FESTIVAL = "Festival Perempuan Kreatif";
const GERAKAN = "Gerakan Sosial & Lingkungan";

const SKOR_TOPIK: PetaSkor = {
  "Pemulihan diri dan kesehatan mental": { [BANGKIT]: 3, [SEHAT]: 1 },
  "Literasi dan advokasi": { [PODCAST]: 3, [GERAKAN]: 2 },
  "Bisnis dan Kewirausahaan": { [INKUBATOR]: 3, [KREASI]: 1 },
  "Pemasaran digital dan desain": { [DIGITAL]: 3, [FESTIVAL]: 1 },
  "Jejaring dan kolaborasi": { [RUANG]: 3, [FESTIVAL]: 1 },
  "Kesehatan, parenting dan reproduksi": { [SEHAT]: 3, [BANGKIT]: 1 },
  "Pendidikan anak perempuan": { [BEASISWA]: 3 },
  "Keuangan dan permodalan usaha": { [KREASI]: 3, [INKUBATOR]: 1 },
  "Kegiatan sosial dan lingkungan": { [GERAKAN]: 3, [RUANG]: 1 },
  "Karya kreatif dan lingkungan": { [FESTIVAL]: 2, [GERAKAN]: 2 },
};
const SKOR_TUJUAN: PetaSkor = {
  "Memulihkan diri dan menjaga kesehatan": { [BANGKIT]: 2, [SEHAT]: 2 },
  "Mencapai kemandirian ekonomi": { [INKUBATOR]: 2, [KREASI]: 2 },
  "Menambah keterampilan": { [DIGITAL]: 2, [INKUBATOR]: 1 },
  "Memperluas jejaring": { [RUANG]: 2, [FESTIVAL]: 1 },
  "Mendapat akses permodalan": { [KREASI]: 2, [INKUBATOR]: 1 },
  "Bantuan pendidikan untuk anak": { [BEASISWA]: 3 },
  "Mempromosikan hasil karya": { [FESTIVAL]: 2, [DIGITAL]: 1 },
};
const SKOR_KERJA: PetaSkor = {
  "Pelajar/Mahasiswa": { [DIGITAL]: 1, [BEASISWA]: 1 },
  "Ibu rumah tangga": { [SEHAT]: 1, [KREASI]: 1, [RUANG]: 1 },
  Karyawan: { [DIGITAL]: 1, [RUANG]: 1 },
  Wirausaha: { [INKUBATOR]: 1, [DIGITAL]: 1, [FESTIVAL]: 1 },
  "Belum bekerja": { [DIGITAL]: 1, [INKUBATOR]: 1 },
  Lainnya: {},
};
const SKOR_EKONOMI: PetaSkor = {
  "Kurang mampu": { [KREASI]: 1, [BEASISWA]: 1, [BANGKIT]: 1 },
  Menengah: {},
  Mapan: { [GERAKAN]: 1, [RUANG]: 1 },
};

const NAMA_KATEGORI: Record<string, string> = {
  kesehatan: "Kesehatan",
  bisnis: "Bisnis",
  pelatihan: "Pelatihan",
  komunitas: "Komunitas",
};

const CEK =
  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

/* ---------- Perhitungan rekomendasi ---------- */
function hitung(s: Jawaban): Rekomendasi[] {
  const skor: Record<string, number> = {};
  const alasan: Record<string, Alasan> = {};
  // Skor tertinggi yang mungkin untuk jawaban ini (satu program cocok penuh = 100%).
  let penyebut = 0;

  const maks = (bobot: Bobot): number => Math.max(0, ...Object.values(bobot));
  const alasanProgram = (prog: string): Alasan =>
    (alasan[prog] ??= { topik: [], tujuan: [], profil: false });

  const tambah = (
    peta: PetaSkor,
    kunci: string,
    jenis: "topik" | "tujuan" | "profil",
  ): void => {
    const bobot = peta[kunci] ?? {};
    penyebut += maks(bobot);
    for (const [prog, nilai] of Object.entries(bobot)) {
      skor[prog] = (skor[prog] ?? 0) + nilai;
      const a = alasanProgram(prog);
      if (jenis === "profil") a.profil = true;
      else a[jenis].push(kunci);
    }
  };

  s.topik.forEach((t) => tambah(SKOR_TOPIK, t, "topik"));
  s.tujuan.forEach((t) => tambah(SKOR_TUJUAN, t, "tujuan"));
  tambah(SKOR_KERJA, s.kerja, "profil");
  tambah(SKOR_EKONOMI, s.ekonomi, "profil");

  const usia = Number(s.usia);
  const bobotUsia: Bobot =
    usia < 18
      ? { [BEASISWA]: 2, [DIGITAL]: 1 }
      : usia >= 60
        ? { [RUANG]: 1, [SEHAT]: 1 }
        : {};
  penyebut += maks(bobotUsia);
  for (const [prog, nilai] of Object.entries(bobotUsia)) {
    skor[prog] = (skor[prog] ?? 0) + nilai;
    alasanProgram(prog).profil = true;
  }

  return semuaProgram()
    .map((p, i): Rekomendasi => {
      const sk = skor[p.nama] ?? 0;
      return {
        p,
        skor: sk,
        i,
        alasan: alasan[p.nama],
        persen: penyebut
          ? Math.max(1, Math.min(100, Math.round((sk / penyebut) * 100)))
          : 0,
      };
    })
    .filter((x) => x.skor > 0)
    .sort((a, b) => b.skor - a.skor || a.i - b.i)
    .slice(0, 4); // 1 utama + hingga 3 program lain
}

/* ---------- Tampilan ---------- */
let overlay: HTMLDivElement | null = null;
let page: HTMLDivElement | null = null;
let lastFocus: HTMLElement | null = null;
let state: Jawaban = barisAwal();

function barisAwal(): Jawaban {
  return { step: 1, usia: "", kerja: "", ekonomi: "", topik: [], tujuan: [] };
}

function reset(): void {
  state = barisAwal();
}

function dibangun(): void {
  if (overlay) return;
  const lapisan = document.createElement("div");
  lapisan.className = "tp-overlay";
  lapisan.hidden = true;
  lapisan.setAttribute("role", "dialog");
  lapisan.setAttribute("aria-modal", "true");
  lapisan.setAttribute("aria-labelledby", "tp-title");
  const halaman = document.createElement("div");
  halaman.className = "tp-page";
  lapisan.appendChild(halaman);
  document.body.appendChild(lapisan);
  overlay = lapisan;
  page = halaman;

  halaman.addEventListener("click", (e) => {
    const sasaran = e.target as Element;
    const opsi = sasaran.closest<HTMLElement>("[data-opsi]");
    if (opsi) {
      pilih(opsi);
      return;
    }
    const aksi = sasaran.closest("[data-aksi]");
    if (!aksi) return;
    switch (aksi.getAttribute("data-aksi")) {
      case "batal":
        tutup();
        break;
      case "kembali":
        simpanUsia();
        state.step -= 1;
        render();
        break;
      case "lanjut":
        lanjut();
        break;
      case "ulang":
        reset();
        render();
        break;
      case "semua":
        tutup();
        keDaftarProgram();
        break;
    }
  });
  halaman.addEventListener("input", (e) => {
    const el = e.target as HTMLInputElement;
    if (el.id === "tp-usia") {
      state.usia = el.value;
      el.closest(".tp-group")?.classList.remove("has-error");
    }
  });

  // Fase capture: catat dulu apakah ada pop-up lain terbuka, sebelum skripnya menutup diri.
  let popupTerbuka = false;
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Escape") return;
      popupTerbuka = !!document.querySelector(
        ".dp-overlay:not([hidden]), .auth-overlay:not([hidden])",
      );
    },
    true,
  );
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || lapisan.hidden || popupTerbuka) return;
    tutup();
  });
}

function buka(): void {
  dibangun();
  if (!overlay) return;
  reset();
  lastFocus = document.activeElement as HTMLElement | null;
  const header = document.querySelector(".site-header");
  overlay.style.top = `${header ? Math.round(header.getBoundingClientRect().bottom) : 96}px`;
  render();
  overlay.hidden = false;
  document.body.classList.add("tp-open");
  overlay.scrollTop = 0;
}

function tutup(): void {
  if (!overlay || overlay.hidden) return;
  overlay.hidden = true;
  document.body.classList.remove("tp-open");
  lastFocus?.focus();
}

function simpanUsia(): void {
  const el = document.getElementById("tp-usia") as HTMLInputElement | null;
  if (el) state.usia = el.value;
}

function penanda(aktif: number): string {
  const nama = ["Profil", "Preferensi", "Tujuan"];
  const butir = nama
    .map((n, i) => {
      const no = i + 1;
      const kelas = no === aktif ? "active" : no < aktif ? "done" : "";
      const sekarang = no === aktif ? ' aria-current="step"' : "";
      return `<li class="${kelas}"${sekarang}><span class="tp-num">${no}</span><span class="tp-label">${n}</span></li>`;
    })
    .join("");
  return `<ol class="tp-steps" aria-label="Langkah">${butir}</ol>`;
}

function opsiHtml(
  daftar: string[],
  terpilih: string | string[],
  jenis: JenisOpsi,
  multi: boolean,
): string {
  const tombol = daftar
    .map((t) => {
      const on = Array.isArray(terpilih) ? terpilih.includes(t) : terpilih === t;
      const atribut = multi
        ? `aria-pressed="${on}"`
        : `role="radio" aria-checked="${on}"`;
      return `<button type="button" class="tp-option" data-opsi="${jenis}" data-nilai="${esc(t)}" ${atribut}>${esc(t)}</button>`;
    })
    .join("");
  return `<div class="tp-options" role="${multi ? "group" : "radiogroup"}">${tombol}</div>`;
}

function grup(id: string, label: string, isi: string, bantuan?: string): string {
  return (
    `<div class="tp-group" data-grup="${id}"><span class="tp-label">${esc(label)}</span>` +
    (bantuan ? `<p class="tp-help">${esc(bantuan)}</p>` : "") +
    `${isi}<p class="tp-error" role="alert"></p></div>`
  );
}

function render(): void {
  if (!page) return;
  const s = state;
  let html = `<h2 class="tp-title" id="tp-title">${
    s.step === 4 ? "Hasil Rekomendasi Program" : "Temukan Program Yang Tepat Untuk Anda"
  }</h2>`;
  page.className = "tp-page" + (s.step === 4 ? " wide" : "");

  if (s.step === 4) {
    html += hasilHtml();
    page.innerHTML = html;
    page.querySelector<HTMLElement>(".tp-btn.primary")?.focus();
    return;
  }

  html += penanda(s.step) + '<div class="tp-card">';
  if (s.step === 1) {
    html +=
      '<div class="tp-group" data-grup="usia"><label class="tp-label" for="tp-usia">Usia</label>' +
      '<input class="tp-input" id="tp-usia" type="number" inputmode="numeric" min="5" max="100" placeholder="Contoh: 25" value="' +
      esc(s.usia) +
      '" /><p class="tp-error" role="alert"></p></div>' +
      grup("kerja", "Status Pekerjaan", opsiHtml(KERJA, s.kerja, "kerja", false)) +
      grup("ekonomi", "Kondisi Ekonomi", opsiHtml(EKONOMI, s.ekonomi, "ekonomi", false));
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
    `<button type="button" class="tp-btn" data-aksi="${s.step === 1 ? "batal" : "kembali"}">${s.step === 1 ? "Batal" : "Kembali"}</button>` +
    `<button type="button" class="tp-btn primary" data-aksi="lanjut">${s.step === 3 ? "Analisis Profil Saya" : "Lanjut"}</button></div></div>`;
  page.innerHTML = html;
  page.querySelector<HTMLElement>("#tp-usia, .tp-option")?.focus({ preventScroll: true });
}

function pilih(tombol: HTMLElement): void {
  const jenis = tombol.getAttribute("data-opsi") as JenisOpsi | null;
  const nilai = tombol.getAttribute("data-nilai");
  if (!jenis || nilai === null) return;

  if (jenis === "kerja" || jenis === "ekonomi") {
    state[jenis] = nilai;
    tombol.parentElement?.querySelectorAll(".tp-option").forEach((b) => {
      b.setAttribute("aria-checked", String(b === tombol));
    });
  } else {
    const daftar = state[jenis];
    const i = daftar.indexOf(nilai);
    if (i === -1) daftar.push(nilai);
    else daftar.splice(i, 1);
    tombol.setAttribute("aria-pressed", String(i === -1));
  }
  tombol.closest(".tp-group")?.classList.remove("has-error");
}

function galat(id: string, pesan: string): void {
  const g = page?.querySelector(`[data-grup="${id}"]`);
  if (!g) return;
  g.classList.add("has-error");
  const teks = g.querySelector(".tp-error");
  if (teks) teks.textContent = pesan;
}

function lanjut(): void {
  if (!page || !overlay) return;
  const s = state;
  let ok = true;
  page.querySelectorAll(".has-error").forEach((g) => g.classList.remove("has-error"));

  if (s.step === 1) {
    simpanUsia();
    const u = Number(s.usia);
    if (!s.usia || !Number.isFinite(u) || u < 5 || u > 100 || Math.floor(u) !== u) {
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
    page.querySelector(".has-error")?.scrollIntoView({ block: "center", behavior: "smooth" });
    return;
  }
  s.step += 1;
  render();
  overlay.scrollTop = 0;
}

function daftarKata(arr: string[]): string {
  if (arr.length < 2) return arr.join("");
  return `${arr.slice(0, -1).join(", ")} dan ${arr[arr.length - 1]}`;
}

function hasilHtml(): string {
  const hasil = hitung(state);
  if (!hasil.length) {
    return (
      '<div class="tp-card"><p>Belum ada program yang cocok dengan pilihan Anda. Silakan lihat semua program.</p>' +
      '<div class="tp-actions"><button type="button" class="tp-btn" data-aksi="ulang">Ulangi</button>' +
      '<button type="button" class="tp-btn primary" data-aksi="semua">Lihat Semua Program</button></div></div>'
    );
  }

  const [u, ...lain] = hasil as [Rekomendasi, ...Rekomendasi[]];
  const a: Alasan = u.alasan ?? { topik: [], tujuan: [], profil: false };
  const cek: string[] = [];
  if (a.topik.length) cek.push("Minat sesuai");
  if (a.tujuan.length) cek.push("Tujuan sesuai");
  if (a.profil) cek.push("Status peserta sesuai");
  if (a.topik.length && a.tujuan.length) cek.push("Karakteristik program sesuai");

  const alasan: string[] = [];
  if (a.topik.length)
    alasan.push(`minat Anda pada ${daftarKata(a.topik).toLowerCase()} sesuai dengan fokus program`);
  if (a.tujuan.length)
    alasan.push(`tujuan Anda untuk ${daftarKata(a.tujuan).toLowerCase()} sejalan dengan program ini`);
  if (a.profil)
    alasan.push(`status Anda (${state.kerja.toLowerCase()}) termasuk sasaran program`);

  let html =
    '<p class="tp-eyebrow2">Program yang paling sesuai dengan profil Anda</p>' +
    '<section class="tp-main"><div class="tp-main-top"><div class="tp-main-text">' +
    `<span class="tp-eyebrow">Rekomendasi Utama</span><h3>${esc(u.p.nama)}</h3>` +
    "<p>Program ini direkomendasikan karena memiliki karakteristik yang sesuai dengan profil dan tujuan Anda.</p></div>" +
    (u.p.gambar ? `<img src="${esc(u.p.gambar)}" alt="${esc(u.p.nama)}" />` : "") +
    '</div><div class="tp-why"><h4>Mengapa program ini direkomendasikan?</h4><ul class="tp-checks">' +
    cek.map((t) => `<li>${CEK}${esc(t)}</li>`).join("") +
    `</ul><div class="tp-score"><b>${u.persen}%</b><span>Tingkat Kesesuaian</span></div>` +
    (alasan.length ? `<p class="tp-reason">Program ini cocok karena ${esc(alasan.join(", "))}.</p>` : "") +
    '</div><div class="tp-main-act"><button type="button" class="tp-btn primary" data-daftar-program ' +
    `data-daftar-nama="${esc(u.p.nama)}">Daftar Sekarang</button></div></section>`;

  if (lain.length) {
    html += '<h3 class="tp-other-title">Program Lain Yang Mungkin Sesuai</h3><div class="tp-results">';
    for (const x of lain) {
      const b: Alasan = x.alasan ?? { topik: [], tujuan: [], profil: false };
      const r: string[] = [];
      if (b.topik.length)
        r.push(`minat pada ${daftarKata(b.topik).toLowerCase()} sesuai dengan fokus program`);
      if (b.tujuan.length)
        r.push(`tujuan Anda untuk ${daftarKata(b.tujuan).toLowerCase()} sejalan dengan program ini`);
      if (!r.length && b.profil) r.push("profil Anda termasuk sasaran program");
      html +=
        '<article class="tp-result">' +
        (x.p.gambar ? `<img src="${esc(x.p.gambar)}" alt="" />` : "") +
        `<div class="tp-body"><div class="tp-meta"><span class="tp-badge">${esc(NAMA_KATEGORI[x.p.kategori] ?? "Program")}</span>` +
        `<span class="tp-pct">${x.persen}% sesuai</span></div><h3>${esc(x.p.nama)}</h3>` +
        `<p>Program ini direkomendasikan karena ${esc(r.join(", "))}.</p>` +
        `<button type="button" class="tp-btn-red" data-daftar-program data-daftar-nama="${esc(x.p.nama)}">Daftar Program</button></div></article>`;
    }
    html += "</div>";
  }

  html +=
    '<p class="tp-note">Persentase dihitung dari kecocokan jawaban Anda dengan tiap program. Ini hanya saran awal; tim PERI dapat membantu bila Anda masih ragu.</p>' +
    '<div class="tp-actions tp-actions--center">' +
    '<button type="button" class="tp-btn" data-aksi="ulang">Ulangi Analisis</button>' +
    '<button type="button" class="tp-btn primary" data-aksi="semua">Lihat Semua Program</button></div>';
  return html;
}

export function initTemukanProgram(): void {
  document.addEventListener("peri:lihat-program", tutup);
  document.addEventListener("click", (e) => {
    const pemicu = (e.target as Element).closest("[data-temukan-program]");
    if (!pemicu) return;
    e.preventDefault();
    buka();
  });
}