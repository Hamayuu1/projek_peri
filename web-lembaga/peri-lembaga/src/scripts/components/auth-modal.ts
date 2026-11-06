/* Modal Masuk dan Daftar. Muncul di atas halaman saat tautan login.html atau
   register.html diklik, tanpa pindah halaman. Desain: Figma node 1:839 (login)
   dan 1:840 (register). */
import logoUrl from "../../assets/auth/logo-peri.png";
import logoFallbackUrl from "../../assets/logo.svg";
import { authApi } from "../services/api";
import type { AuthView, User } from "../types";

const ADMIN_URL: string =
  import.meta.env.VITE_ADMIN_URL ?? "../peri-admin/dashboard.html";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EYE =
  '<svg viewBox="0 0 20 14" width="19" height="14" fill="none" stroke="#aaa" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 7s3.4-6 9-6 9 6 9 6-3.4 6-9 6S1 7 1 7z"/><circle cx="10" cy="7" r="2.6"/><line class="slash" x1="3" y1="13" x2="17" y2="1"/></svg>';
const GOOGLE =
  '<svg viewBox="0 0 48 48" width="19" height="19" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';

interface FieldOptions {
  top: number;
  autocomplete?: string;
  resend?: boolean;
}

function field(id: string, type: string, placeholder: string, o: FieldOptions): string {
  const isPw = type === "password";
  return (
    `<div class="auth-field" style="top:${o.top}px">` +
    `<input id="${id}" type="${type}" placeholder="${placeholder}" autocomplete="${o.autocomplete ?? "off"}"${isPw ? ' class="has-eye"' : ""}>` +
    (isPw
      ? `<button type="button" class="auth-eye" data-eye="${id}" aria-label="Tampilkan atau sembunyikan kata sandi">${EYE}</button>`
      : "") +
    (o.resend ? '<button type="button" class="auth-resend">Resend</button>' : "") +
    "</div>"
  );
}

function header(top: number): string {
  return (
    `<div class="auth-header" style="top:${top}px">` +
    `<img class="auth-logo" src="${logoUrl}" alt="" data-fallback="${logoFallbackUrl}">` +
    '<div class="auth-brand"><span>Perempuan</span><span>Kreatif</span><span>Indonesia</span></div></div>'
  );
}

function silhouettes(top: number): string {
  return (
    `<div class="auth-sil auth-sil-l" style="top:${top}px"></div>` +
    `<div class="auth-sil auth-sil-r" style="top:${top - 2}px"></div>`
  );
}

const LOGIN_HTML =
  '<div class="auth-card auth-card-login" data-view="login" role="dialog" aria-modal="true" aria-labelledby="auth-title-login">' +
  header(0) +
  silhouettes(83) +
  '<p class="auth-title" id="auth-title-login" style="top:117px">Account Log In</p>' +
  '<form class="auth-form" novalidate data-form="login">' +
  field("auth-l-email", "email", "Email", { top: 149, autocomplete: "email" }) +
  field("auth-l-pass", "password", "Enter password", { top: 210, autocomplete: "current-password" }) +
  '<p class="auth-msg" style="top:253px" role="alert"></p>' +
  '<button type="submit" class="auth-submit" style="top:273px">Log In</button>' +
  "</form>" +
  '<button type="button" class="auth-link" style="left:62px;top:312px" data-go="register">Register Now</button>' +
  '<button type="button" class="auth-link" style="left:187px;top:312px" data-nolink>Forgot Password?</button>' +
  '<p class="auth-more" style="top:351px">More Login Methods</p>' +
  `<button type="button" class="auth-google" style="top:369px" aria-label="Masuk dengan Google" data-nolink>${GOOGLE}</button>` +
  "</div>";

const REGISTER_HTML =
  '<div class="auth-card auth-card-register" data-view="register" role="dialog" aria-modal="true" aria-labelledby="auth-title-register">' +
  header(25) +
  silhouettes(164) +
  '<p class="auth-title" id="auth-title-register" style="top:113px">Register</p>' +
  '<form class="auth-form" novalidate data-form="register">' +
  field("auth-r-email", "email", "Email", { top: 137, autocomplete: "email" }) +
  field("auth-r-code", "text", "Verification Code", { top: 192, resend: true }) +
  field("auth-r-pass", "password", "Enter password", { top: 247, autocomplete: "new-password" }) +
  field("auth-r-pass2", "password", "Confirm password", { top: 302, autocomplete: "new-password" }) +
  '<p class="auth-msg" style="top:341px" role="alert"></p>' +
  '<button type="submit" class="auth-submit" style="top:360px">Log In</button>' +
  "</form>" +
  '<p class="auth-have" style="top:401px">Already have an account? <button type="button" class="auth-link-inline" data-go="login">Log In</button></p>' +
  '<p class="auth-more" style="top:442px">More Login Methods</p>' +
  `<button type="button" class="auth-google" style="top:463px" aria-label="Daftar dengan Google" data-nolink>${GOOGLE}</button>` +
  "</div>";

let overlay: HTMLDivElement | null = null;
let lastFocus: HTMLElement | null = null;

function inputIn(form: HTMLFormElement, selector: string): HTMLInputElement {
  const el = form.querySelector<HTMLInputElement>(selector);
  if (!el) throw new Error(`Kolom ${selector} tidak ditemukan`);
  return el;
}

function pesanIn(form: HTMLFormElement): HTMLElement {
  const el = form.querySelector<HTMLElement>(".auth-msg");
  if (!el) throw new Error("Elemen .auth-msg tidak ditemukan");
  return el;
}

function setMsg(el: HTMLElement, text: string, ok = false): void {
  el.className = "auth-msg" + (ok ? " ok" : "");
  el.textContent = text;
}

/** Setelah login atau registrasi: admin ke panel admin, pendaftar tetap di situs. */
function afterAuth(user: User): void {
  if (user.role === "admin") {
    location.href = ADMIN_URL;
    return;
  }
  close();
  renderNavbar(user);
  // Memberi tahu skrip lain (mis. pop-up Daftar Program) bahwa login berhasil.
  document.dispatchEvent(new CustomEvent<User>("peri:login", { detail: user }));
}

/** Ganti tombol Masuk/Daftar dengan Keluar saat sudah login. */
function renderNavbar(user: User): void {
  const box = document.querySelector<HTMLElement>(".navbar-actions");
  if (!box) return;
  box.innerHTML = "";
  if (user.role === "admin") {
    const panel = document.createElement("a");
    panel.href = ADMIN_URL;
    panel.className = "btn btn--primary";
    panel.textContent = "Panel Admin";
    box.appendChild(panel);
  }
  const out = document.createElement("a");
  out.href = "#";
  out.className = "btn btn--outline";
  out.textContent = "Keluar";
  out.title = user.email;
  out.addEventListener("click", (e) => {
    e.preventDefault();
    void authApi.logout().then(() => location.reload());
  });
  box.appendChild(out);
}

async function restoreSession(): Promise<void> {
  const r = await authApi.me();
  if (r.ok) renderNavbar(r.data.user);
}

async function resendCode(btn: HTMLButtonElement): Promise<void> {
  const form = btn.closest("form");
  if (!form) return;
  const msg = pesanIn(form);
  const email = inputIn(form, "#auth-r-email").value.trim();
  if (!EMAIL_RE.test(email)) {
    setMsg(msg, "Masukkan email yang valid.");
    return;
  }
  btn.disabled = true;
  const r = await authApi.kirimKode(email);
  setMsg(msg, r.ok ? (r.data.pesan ?? "Kode verifikasi dikirim.") : r.error, r.ok);
  setTimeout(() => {
    btn.disabled = false;
  }, r.ok ? 60000 : 2000);
}

function validate(form: HTMLFormElement): string {
  const v = (s: string) => inputIn(form, s).value.trim();
  if (form.dataset.form === "login") {
    if (!EMAIL_RE.test(v("#auth-l-email"))) return "Masukkan email yang valid.";
    if (!v("#auth-l-pass")) return "Masukkan kata sandi.";
  } else {
    if (!EMAIL_RE.test(v("#auth-r-email"))) return "Masukkan email yang valid.";
    if (!v("#auth-r-code")) return "Masukkan kode verifikasi.";
    const p = inputIn(form, "#auth-r-pass").value;
    if (p.length < 8 || p.length > 30) return "Kata sandi 8–30 karakter.";
    if (p !== inputIn(form, "#auth-r-pass2").value) return "Kata sandi tidak sama.";
  }
  return "";
}

async function submit(form: HTMLFormElement): Promise<void> {
  const msg = pesanIn(form);
  const err = validate(form);
  if (err) {
    setMsg(msg, err);
    return;
  }
  const btn = form.querySelector<HTMLButtonElement>(".auth-submit");
  if (btn) btn.disabled = true;
  const r =
    form.dataset.form === "login"
      ? await authApi.login({
          email: inputIn(form, "#auth-l-email").value.trim(),
          password: inputIn(form, "#auth-l-pass").value,
        })
      : await authApi.register({
          email: inputIn(form, "#auth-r-email").value.trim(),
          kode: inputIn(form, "#auth-r-code").value.trim(),
          password: inputIn(form, "#auth-r-pass").value,
        });
  if (btn) btn.disabled = false;
  if (!r.ok) {
    setMsg(msg, r.error);
    return;
  }
  afterAuth(r.data.user);
}

function build(): HTMLDivElement {
  if (overlay) return overlay;
  const box = document.createElement("div");
  box.className = "auth-overlay";
  box.hidden = true;
  box.innerHTML = LOGIN_HTML + REGISTER_HTML;
  document.body.appendChild(box);
  overlay = box;

  // Logo cadangan bila gambar utama gagal dimuat.
  box.querySelectorAll<HTMLImageElement>(".auth-logo").forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        img.classList.add("is-fallback");
        img.src = img.dataset.fallback ?? "";
      },
      { once: true },
    );
  });

  box.addEventListener("mousedown", (e) => {
    if (e.target === box) close();
  });

  box.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const go = target.closest<HTMLElement>("[data-go]");
    if (go) {
      show(go.dataset.go as AuthView);
      return;
    }
    const rs = target.closest<HTMLButtonElement>(".auth-resend");
    if (rs) {
      void resendCode(rs);
      return;
    }
    const eye = target.closest<HTMLElement>("[data-eye]");
    if (eye) {
      const inp = document.getElementById(eye.dataset.eye ?? "") as HTMLInputElement | null;
      if (!inp) return;
      const showPw = inp.type === "password";
      inp.type = showPw ? "text" : "password";
      eye.classList.toggle("on", showPw);
    }
  });

  box.querySelectorAll<HTMLFormElement>("form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      void submit(form);
    });
    form.addEventListener("input", () => setMsg(pesanIn(form), ""));
  });
  return box;
}

function show(view: AuthView): void {
  if (!overlay) return;
  overlay.querySelectorAll<HTMLElement>(".auth-card").forEach((c) => {
    c.hidden = c.dataset.view !== view;
  });
  overlay.querySelector<HTMLInputElement>(`.auth-card[data-view="${view}"] input`)?.focus();
}

export function open(view: AuthView): void {
  const box = build();
  lastFocus = document.activeElement as HTMLElement | null;
  box.hidden = false;
  document.body.classList.add("auth-open");
  show(view);
}

export function close(): void {
  if (!overlay || overlay.hidden) return;
  overlay.hidden = true;
  document.body.classList.remove("auth-open");
  lastFocus?.focus();
}

export function initAuthModal(): void {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  // Tautan ke login.html atau register.html membuka modal.
  document.addEventListener("click", (e) => {
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
    if (!a) return;
    const href = a.getAttribute("href") ?? "";
    if (/(^|\/)login\.html$/.test(href)) {
      e.preventDefault();
      open("login");
    } else if (/(^|\/)register\.html$/.test(href)) {
      e.preventDefault();
      open("register");
    }
  });

  window.PERIAuth = { open, close };
  void restoreSession();
}