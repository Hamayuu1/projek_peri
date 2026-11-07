/* Halaman Umpan Balik: bagian "Apa Kata Mereka" dan formulir umpan balik. */
import { kirimBukuTamu } from "../services/api";
import type { UmpanBalikDisetujui } from "../types";

/* Isi daftar ini hanya umpan balik yang SUDAH ditinjau admin dan diizinkan tampil
   oleh penulisnya. Tiga entri di bawah adalah CONTOH TAMPILAN (contoh: true) dan di
   halaman diberi label "Contoh". Ganti dengan umpan balik asli, lalu hapus `contoh: true`.
   Bila daftar kosong, seluruh bagian "Apa Kata Mereka" disembunyikan. */
const UMPAN_BALIK_DISETUJUI: UmpanBalikDisetujui[] = [
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

const TAMPIL_AWAL = 3;
const SVG_NS = "http://www.w3.org/2000/svg";
const BINTANG_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  kelas?: string,
  teks?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (kelas) e.className = kelas;
  if (teks !== undefined) e.textContent = teks;
  return e;
}

function bintang(n: number): HTMLElement {
  const wrap = el("div", "testi-stars");
  wrap.setAttribute("role", "img");
  wrap.setAttribute("aria-label", `Penilaian ${n} dari 5`);
  for (let i = 0; i < 5; i++) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("aria-hidden", "true");
    if (i >= n) svg.setAttribute("class", "off");
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", BINTANG_PATH);
    svg.appendChild(p);
    wrap.appendChild(svg);
  }
  return wrap;
}

function inisial(nama: string): string {
  const kata = nama.replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/);
  return ((kata[0] ?? "?").charAt(0) + (kata[1] ? kata[1].charAt(0) : "")).toUpperCase();
}

function kartu(d: UmpanBalikDisetujui): HTMLElement {
  const c = el("article", "testi-card");
  c.dataset.reveal = "";
  const atas = el("div", "testi-card__top");
  atas.appendChild(bintang(Math.max(0, Math.min(5, Number(d.bintang) || 0))));
  if (d.contoh) atas.appendChild(el("span", "testi-card__badge", "Contoh"));
  c.appendChild(atas);
  c.appendChild(el("p", "testi-card__quote", d.pesan));
  const penulis = el("div", "testi-card__author");
  penulis.appendChild(el("div", "testi-card__avatar", inisial(d.nama)));
  const teks = el("div");
  teks.appendChild(el("b", undefined, d.nama));
  teks.appendChild(el("span", undefined, d.program));
  penulis.appendChild(teks);
  c.appendChild(penulis);
  return c;
}

function initTestimoni(): void {
  const seksi = document.getElementById("apa-kata-mereka");
  const grid = document.getElementById("testi-grid");
  const more = document.getElementById("testi-more");
  const tombol = document.getElementById("testi-toggle");
  if (!seksi || !grid) return;
  if (!UMPAN_BALIK_DISETUJUI.length) {
    seksi.hidden = true;
    return;
  }
  let semua = false;
  const gambar = (): void => {
    grid.textContent = "";
    UMPAN_BALIK_DISETUJUI.slice(0, semua ? undefined : TAMPIL_AWAL).forEach((d) =>
      grid.appendChild(kartu(d)),
    );
    if (tombol) {
      tombol.textContent = semua ? "Tampilkan Lebih Sedikit" : "Lihat Semua Umpan Balik";
      tombol.setAttribute("aria-expanded", String(semua));
    }
  };
  if (more) more.hidden = UMPAN_BALIK_DISETUJUI.length <= TAMPIL_AWAL;
  tombol?.addEventListener("click", () => {
    semua = !semua;
    gambar();
  });
  gambar();
}

/* Formulir: validasi di browser, lalu dikirim ke peri-backend dan tampil
   di menu Buku Tamu pada panel admin. */
function initFormulir(): void {
  const form = document.getElementById("feedback-form") as HTMLFormElement | null;
  const sukses = document.getElementById("form-success");
  const galat = document.getElementById("form-error");
  const tombol = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!form || !sukses || !galat) return;

  const tampilGalat = (teks: string): void => {
    galat.textContent = teks;
    galat.hidden = !teks;
  };
  const nilai = (nama: string): string =>
    (form.elements.namedItem(nama) as HTMLInputElement | HTMLTextAreaElement).value.trim();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    sukses.hidden = true;
    tampilGalat("");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (tombol) tombol.disabled = true;
    const r = await kirimBukuTamu({ nama: nilai("nama"), email: nilai("email"), pesan: nilai("pesan") });
    if (r.ok) {
      sukses.hidden = false;
      form.reset();
      sukses.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else if (r.status === 0) {
      tampilGalat("Server belum aktif. Pesan belum terkirim, coba lagi nanti.");
    } else {
      tampilGalat(r.error === "Terjadi kesalahan. Coba lagi." ? "Pesan gagal dikirim." : r.error);
    }
    if (tombol) tombol.disabled = false;
  });
}

export function init(): void {
  initTestimoni();
  initFormulir();
}