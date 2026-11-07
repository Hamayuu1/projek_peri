/* =========================================================
   Pop-up Pendaftaran Program.
   Dipicu tombol [data-daftar-program] (pada kartu program, atau di luar kartu
   dengan data-daftar-nama).
   Alur: belum masuk -> modal login (components/auth-modal.ts) -> pop-up formulir
         -> POST /api/pendaftaran-program (peri-backend, port 5001)
         -> tampilan "berhasil" atau "sudah terdaftar".
   Desain: Figma node 160:169, 160:342, 160:418.
   ========================================================= */
import { authApi, kirimPendaftaranProgram } from "../../services/api";
import type { ProgramInfo, RingkasanPendaftaran, User } from "../../types";
import { esc } from "../../utils/html";
import { cariProgram, infoDariKartu, keDaftarProgram, semuaProgram } from "./katalog";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PENDING_MS = 3 * 60 * 1000; // program yang menunggu login berlaku 3 menit

const ICON = {
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  alert: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18h.01"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
} as const;

function svg(nama: keyof typeof ICON, tebal = 1.8): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${tebal}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[nama]}</svg>`;
}

/* ---------- Validasi (cermin dari aturan di server) ---------- */
function normalkanWa(nilai: string): string {
  let n = nilai.replace(/[\s\-().]/g, "");
  if (n.startsWith("+62")) n = "0" + n.slice(3);
  else if (n.startsWith("62")) n = "0" + n.slice(2);
  return /^08\d{8,12}$/.test(n) ? n : "";
}

/* ---------- Pop-up ---------- */
type Tampilan = "form" | "duplikat" | "berhasil";

let overlay: HTMLDivElement | null = null;
let modal: HTMLDivElement | null = null;
let lastFocus: HTMLElement | null = null;
let tampilan: Tampilan = "form";
let konteks: { info: ProgramInfo; user: User | null } | null = null;
let pending: { info: ProgramInfo; waktu: number } | null = null;

const input = (id: string): HTMLInputElement | HTMLSelectElement =>
  document.getElementById(id) as HTMLInputElement | HTMLSelectElement;

function pastikanDibangun(): void {
  if (overlay) return;
  const lapisan = document.createElement("div");
  lapisan.className = "dp-overlay";
  lapisan.hidden = true;
  const kotak = document.createElement("div");
  kotak.className = "dp-modal";
  kotak.setAttribute("role", "dialog");
  kotak.setAttribute("aria-modal", "true");
  kotak.setAttribute("aria-labelledby", "dp-title");
  lapisan.appendChild(kotak);
  document.body.appendChild(lapisan);
  overlay = lapisan;
  modal = kotak;

  lapisan.addEventListener("mousedown", (e) => {
    // Formulir tidak ditutup lewat klik latar agar isian tidak hilang tak sengaja.
    if (e.target === lapisan && tampilan !== "form") tutup();
  });
  kotak.addEventListener("click", (e) => {
    const sasaran = e.target as Element;
    if (sasaran.closest("[data-dp-close]")) {
      tutup();
    } else if (sasaran.closest("[data-dp-lain]")) {
      tutup();
      // Tutup tampilan lain yang menutupi daftar program (mis. hasil rekomendasi).
      document.dispatchEvent(new CustomEvent("peri:lihat-program"));
      keDaftarProgram();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (lapisan.hidden) return;
    if (e.key === "Escape") {
      tutup();
    } else if (e.key === "Tab") {
      const f = kotak.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([readonly]):not([type=hidden]), select",
      );
      const pertama = f[0];
      const terakhir = f[f.length - 1];
      if (!pertama || !terakhir) return;
      if (e.shiftKey && document.activeElement === pertama) {
        e.preventDefault();
        terakhir.focus();
      } else if (!e.shiftKey && document.activeElement === terakhir) {
        e.preventDefault();
        pertama.focus();
      }
    }
  });
}

function buka(info: ProgramInfo, user: User | null): void {
  pastikanDibangun();
  if (!overlay) return;
  konteks = { info, user };
  lastFocus = document.activeElement as HTMLElement | null;
  renderForm();
  overlay.hidden = false;
  document.body.classList.add("dp-open");
}

function tutup(): void {
  if (!overlay || overlay.hidden) return;
  overlay.hidden = true;
  document.body.classList.remove("dp-open");
  lastFocus?.focus();
}

function kepala(eyebrow: string, judul: string): string {
  return (
    '<div class="dp-accent"></div><div class="dp-head"><div>' +
    `<p class="dp-eyebrow">${esc(eyebrow)}</p>` +
    `<h2 class="dp-title" id="dp-title">${esc(judul)}</h2></div>` +
    `<button type="button" class="dp-close" data-dp-close aria-label="Tutup">${svg("x")}</button></div>`
  );
}

interface OpsiKolom {
  select?: string; // HTML <option> bila kolom berupa pilihan
  type?: string;
  placeholder?: string;
  value?: string;
  ac?: string;
  readonly?: boolean;
  max?: number;
  lock?: boolean;
  hint?: string;
}

function kolom(id: string, label: string, opsi: OpsiKolom = {}): string {
  let kontrol: string;
  if (opsi.select !== undefined) {
    kontrol =
      `<select id="${id}" name="${id}">${opsi.select}</select>` +
      `<span class="dp-ico">${svg("chev")}</span>`;
  } else {
    kontrol =
      `<input id="${id}" name="${id}" type="${opsi.type ?? "text"}" ` +
      `placeholder="${esc(opsi.placeholder ?? "")}" value="${esc(opsi.value ?? "")}" ` +
      `autocomplete="${opsi.ac ?? "off"}"` +
      (opsi.readonly ? " readonly" : "") +
      (opsi.max ? ` maxlength="${opsi.max}"` : "") +
      " />" +
      (opsi.lock ? `<span class="dp-ico">${svg("lock")}</span>` : "");
  }
  return (
    `<div class="dp-field" data-field="${id}">` +
    `<label class="dp-label" for="${id}">${esc(label)}${opsi.readonly ? "" : "<b>*</b>"}</label>` +
    `<div class="dp-input">${kontrol}</div>` +
    (opsi.hint ? `<p class="dp-hint">${esc(opsi.hint)}</p>` : "") +
    `<p class="dp-error">${svg("alert")}<span data-msg></span></p></div>`
  );
}

/* --- 1. Formulir (Figma 160:169) --- */
function renderForm(): void {
  if (!modal || !konteks) return;
  tampilan = "form";
  const { info, user } = konteks;
  const opsiProgram = semuaProgram()
    .map(
      (p) =>
        `<option value="${esc(p.nama)}"${p.nama === info.nama ? " selected" : ""}>${esc(p.nama)}</option>`,
    )
    .join("");

  modal.innerHTML =
    kepala("Pendaftaran program", "Daftar Program") +
    '<form novalidate><div class="dp-body">' +
    `<div class="dp-alert err" data-alert hidden>${svg("alert")}<div data-alert-teks></div></div>` +
    kolom("dp-nama", "Nama lengkap", {
      placeholder: "Masukkan nama lengkap Anda",
      ac: "name",
      max: 100,
    }) +
    kolom("dp-email", "Email", {
      type: "email",
      placeholder: "email@gmail.com",
      ...(user ? { value: user.email } : {}),
      ac: "email",
    }) +
    kolom("dp-wa", "Nomor WhatsApp", {
      type: "tel",
      placeholder: "08xxxxxxxxxx",
      ac: "tel",
      max: 20,
      hint: "Konfirmasi pendaftaran dikirim melalui WhatsApp.",
    }) +
    kolom("dp-program", "Program", { select: opsiProgram }) +
    '<div class="dp-field" data-field="dp-setuju">' +
    '<label class="dp-consent"><input type="checkbox" id="dp-setuju" />' +
    `<span class="dp-box">${svg("check", 2.6)}</span>` +
    "<span>Saya menyetujui data saya digunakan PERI untuk keperluan pendaftaran program ini.</span></label>" +
    `<p class="dp-error">${svg("alert")}<span data-msg></span></p></div>` +
    "</div>" +
    '<div class="dp-actions">' +
    '<button type="button" class="dp-btn ghost" data-dp-close>Batal</button>' +
    `<button type="submit" class="dp-btn primary">Kirim Pendaftaran ${svg("arrow")}</button></div></form>`;

  const form = modal.querySelector("form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void kirim(form);
  });
  form.addEventListener("input", (e) => {
    (e.target as Element).closest(".dp-field")?.classList.remove("has-error");
    banner(form, "");
  });
  form.addEventListener("change", (e) => {
    (e.target as Element).closest(".dp-field")?.classList.remove("has-error");
  });
  document.getElementById("dp-nama")?.focus();
}

function banner(form: HTMLFormElement, teks: string): void {
  const b = form.querySelector<HTMLElement>("[data-alert]");
  if (!b) return;
  b.hidden = !teks;
  const isi = b.querySelector("[data-alert-teks]");
  if (isi) isi.textContent = teks;
}

function galatKolom(form: HTMLFormElement, id: string, pesan: string): void {
  const f = form.querySelector(`[data-field="${id}"]`);
  if (!f) return;
  f.classList.add("has-error");
  const teks = f.querySelector("[data-msg]");
  if (teks) teks.textContent = pesan;
}

function validasi(form: HTMLFormElement): boolean {
  const v = (id: string): string => input(id).value.trim();
  const salah: Array<[string, string]> = [];
  if (!v("dp-nama")) salah.push(["dp-nama", "Nama lengkap wajib diisi."]);
  if (!EMAIL_RE.test(v("dp-email"))) salah.push(["dp-email", "Masukkan email yang valid."]);
  if (!normalkanWa(v("dp-wa")))
    salah.push(["dp-wa", "Nomor WhatsApp tidak valid. Gunakan angka, contoh 081234567890."]);
  if (!v("dp-program")) salah.push(["dp-program", "Pilih program."]);
  if (!(input("dp-setuju") as HTMLInputElement).checked)
    salah.push(["dp-setuju", "Centang persetujuan untuk melanjutkan."]);

  form.querySelectorAll(".has-error").forEach((f) => f.classList.remove("has-error"));
  salah.forEach(([id, pesan]) => galatKolom(form, id, pesan));
  const pertama = salah[0];
  if (pertama) input(pertama[0]).focus();
  return salah.length === 0;
}

async function kirim(form: HTMLFormElement): Promise<void> {
  banner(form, "");
  if (!validasi(form)) return;
  const tombol = form.querySelector<HTMLButtonElement>(".dp-btn.primary");
  if (!tombol) return;
  const labelAwal = tombol.innerHTML;
  tombol.disabled = true;
  tombol.textContent = "Mengirim…";

  const body = {
    program: input("dp-program").value,
    nama: input("dp-nama").value.trim(),
    email: input("dp-email").value.trim(),
    wa: input("dp-wa").value.trim(),
    setuju: (input("dp-setuju") as HTMLInputElement).checked,
  };
  const r = await kirimPendaftaranProgram(body);

  if (r.status === 201) {
    renderBerhasil(r.data.data ?? body);
    return;
  }
  if (r.status === 409) {
    renderSudahTerdaftar(r.data.data ?? body);
    return;
  }
  tombol.disabled = false;
  tombol.innerHTML = labelAwal;
  if (r.status === 401) {
    pending = { info: cariProgram(body.program), waktu: Date.now() };
    tutup();
    window.PERIAuth?.open("login");
    return;
  }
  const peta: Record<string, string> = {
    nama: "dp-nama",
    email: "dp-email",
    wa: "dp-wa",
    program: "dp-program",
    setuju: "dp-setuju",
  };
  const idKolom = r.data.kolom ? peta[r.data.kolom] : undefined;
  if (r.status === 400 && idKolom) {
    galatKolom(form, idKolom, r.error);
    input(idKolom).focus();
  } else {
    banner(form, r.error);
  }
}

/* --- 2. Sudah terdaftar (Figma 160:342) --- */
function renderSudahTerdaftar(d: RingkasanPendaftaran): void {
  if (!modal || !konteks) return;
  tampilan = "duplikat";
  const p = cariProgram(d.program || konteks.info.nama);
  modal.innerHTML =
    kepala("Pendaftaran program", "Daftar Program") +
    '<div class="dp-body">' +
    `<div class="dp-alert warn" role="alert">${svg("alert")}` +
    "<div><strong>Anda sudah terdaftar pada program ini</strong>" +
    "Pendaftaran ganda pada program yang sama tidak dapat dilakukan. " +
    "Pilih program lain atau hubungi PERI bila ada kendala.</div></div>" +
    '<div class="dp-program">' +
    (p.gambar ? `<img src="${esc(p.gambar)}" alt="" />` : "") +
    "<div>" +
    (p.kategori ? `<span class="dp-badge">${esc(p.kategori)}</span>` : "") +
    `<h3>${esc(p.nama)}</h3>` +
    (p.deskripsi ? `<p>${esc(p.deskripsi)}</p>` : "") +
    "</div></div>" +
    kolom("dp-nama", "Nama lengkap", { value: d.nama, readonly: true }) +
    kolom("dp-email", "Email", { value: d.email, readonly: true, lock: true }) +
    kolom("dp-wa", "Nomor WhatsApp", { value: d.wa, readonly: true }) +
    "</div>" +
    '<div class="dp-actions">' +
    '<button type="button" class="dp-btn ghost" data-dp-close>Tutup</button>' +
    `<button type="button" class="dp-btn primary" data-dp-lain>Lihat Program Lain ${svg("arrow")}</button></div>`;
  modal.querySelector<HTMLElement>(".dp-btn.primary")?.focus();
}

/* --- 3. Berhasil (Figma 160:418) --- */
function baris(k: string, v: string): string {
  return `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`;
}

function renderBerhasil(d: RingkasanPendaftaran): void {
  if (!modal) return;
  tampilan = "berhasil";
  modal.innerHTML =
    kepala("Terima kasih", "Pendaftaran Terkirim") +
    '<div class="dp-body"><div class="dp-success">' +
    `<div class="dp-ok">${svg("check", 2.4)}</div>` +
    `<p>Pendaftaran Anda pada program ${esc(d.program)} sudah kami terima. Tim PERI akan mengonfirmasi melalui WhatsApp.</p></div>` +
    '<div class="dp-summary">' +
    baris("Program", d.program) +
    baris("Nama", d.nama) +
    baris("Email", d.email) +
    baris("WhatsApp", d.wa) +
    "</div></div>" +
    '<div class="dp-actions">' +
    '<button type="button" class="dp-btn ghost" data-dp-lain>Lihat Program Lain</button>' +
    '<button type="button" class="dp-btn primary" data-dp-close>Selesai</button></div>';
  modal.querySelector<HTMLElement>(".dp-btn.primary")?.focus();
}

/* ---------- Pemicu ---------- */
async function mulai(info: ProgramInfo): Promise<void> {
  const r = await authApi.me();
  if (r.ok && r.data.user) {
    buka(info, r.data.user);
    return;
  }
  pending = { info, waktu: Date.now() };
  window.PERIAuth?.open("login");
}

export function initDaftarProgram(): void {
  document.addEventListener("click", (e) => {
    const tombol = (e.target as Element).closest("[data-daftar-program]");
    if (!tombol) return;
    e.preventDefault();
    const kartu = tombol.closest("[data-program-card]");
    const nama = tombol.getAttribute("data-daftar-nama");
    if (kartu) void mulai(infoDariKartu(kartu));
    else if (nama) void mulai(cariProgram(nama)); // tombol di luar kartu (unggulan / hasil rekomendasi)
  });

  // Setelah login berhasil (dikirim oleh auth-modal.ts), lanjutkan ke formulir.
  document.addEventListener("peri:login", (e) => {
    if (!pending || Date.now() - pending.waktu > PENDING_MS) {
      pending = null;
      return;
    }
    const { info } = pending;
    pending = null;
    buka(info, e.detail);
  });
}