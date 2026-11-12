import { useEffect, useRef, useState, type FormEvent } from "react";
import logoUrl from "../../assets/auth/logo-peri.png";
import logoFallbackUrl from "../../assets/logo.svg";
import { authApi } from "../../scripts/services/api";
import type { AuthView, User } from "../../scripts/types";
import { ADMIN_URL } from "../lib/config";

/* Pop-up Masuk dan Daftar. Tampilan memakai kelas dan koordinat yang sama dengan
   styles/components/auth-modal.css (Figma node 1:839 dan 1:840), jadi CSS tidak diubah. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Pesan = { teks: string; ok: boolean };
const KOSONG: Pesan = { teks: "", ok: false };

function IkonMata() {
  return (
    <svg viewBox="0 0 20 14" width="19" height="14" fill="none" stroke="#aaa" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 7s3.4-6 9-6 9 6 9 6-3.4 6-9 6S1 7 1 7z" />
      <circle cx="10" cy="7" r="2.6" />
      <line className="slash" x1="3" y1="13" x2="17" y2="1" />
    </svg>
  );
}

function IkonGoogle() {
  return (
    <svg viewBox="0 0 48 48" width="19" height="19" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

type KolomProps = {
  id: string;
  type: "email" | "password" | "text";
  placeholder: string;
  top: number;
  nilai: string;
  onUbah: (nilai: string) => void;
  autoComplete?: string;
  kirimUlang?: { onKlik: () => void; mati: boolean };
};

function KolomAuth({ id, type, placeholder, top, nilai, onUbah, autoComplete = "off", kirimUlang }: KolomProps) {
  const sandi = type === "password";
  const [lihat, setLihat] = useState(false);
  return (
    <div className="auth-field" style={{ top }}>
      <input
        id={id}
        type={sandi && lihat ? "text" : type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={sandi ? "has-eye" : undefined}
        value={nilai}
        onChange={(e) => onUbah(e.target.value)}
      />
      {sandi && (
        <button
          type="button"
          className={"auth-eye" + (lihat ? " on" : "")}
          aria-label="Tampilkan atau sembunyikan kata sandi"
          onClick={() => setLihat(!lihat)}
        >
          <IkonMata />
        </button>
      )}
      {kirimUlang && (
        <button type="button" className="auth-resend" disabled={kirimUlang.mati} onClick={kirimUlang.onKlik}>
          Resend
        </button>
      )}
    </div>
  );
}

function Kepala({ top, logoGagal, onGagal }: { top: number; logoGagal: boolean; onGagal: () => void }) {
  return (
    <div className="auth-header" style={{ top }}>
      <img
        className={"auth-logo" + (logoGagal ? " is-fallback" : "")}
        src={logoGagal ? logoFallbackUrl : logoUrl}
        alt=""
        onError={logoGagal ? undefined : onGagal}
      />
      <div className="auth-brand">
        <span>Perempuan</span>
        <span>Kreatif</span>
        <span>Indonesia</span>
      </div>
    </div>
  );
}

function Siluet({ top }: { top: number }) {
  return (
    <>
      <div className="auth-sil auth-sil-l" style={{ top }} />
      <div className="auth-sil auth-sil-r" style={{ top: top - 2 }} />
    </>
  );
}

type Props = {
  tampilan: AuthView;
  onUbahTampilan: (v: AuthView) => void;
  onTutup: () => void;
};

export default function AuthModal({ tampilan, onUbahTampilan, onTutup }: Props) {
  const wadah = useRef<HTMLDivElement>(null);
  const [logoGagal, setLogoGagal] = useState(false);

  // Isian dan pesan tiap formulir (kedua formulir tetap ada, hanya satu yang tampak).
  const [lEmail, setLEmail] = useState("");
  const [lSandi, setLSandi] = useState("");
  const [lPesan, setLPesan] = useState<Pesan>(KOSONG);
  const [rEmail, setREmail] = useState("");
  const [rKode, setRKode] = useState("");
  const [rSandi, setRSandi] = useState("");
  const [rSandi2, setRSandi2] = useState("");
  const [rPesan, setRPesan] = useState<Pesan>(KOSONG);
  const [mengirim, setMengirim] = useState(false);
  const [kirimUlangMati, setKirimUlangMati] = useState(false);

  // Kunci gulir halaman, tutup dengan Esc, dan fokus ke kolom pertama saat tampilan berganti.
  useEffect(() => {
    document.body.classList.add("auth-open");
    const saatTombol = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onTutup();
    };
    document.addEventListener("keydown", saatTombol);
    return () => {
      document.body.classList.remove("auth-open");
      document.removeEventListener("keydown", saatTombol);
    };
  }, [onTutup]);

  useEffect(() => {
    wadah.current?.querySelector<HTMLInputElement>(`.auth-card[data-view="${tampilan}"] input`)?.focus();
  }, [tampilan]);

  /** Setelah login atau registrasi: admin ke panel admin, pendaftar tetap di situs. */
  const selesai = (user: User): void => {
    if (user.role === "admin") {
      location.href = ADMIN_URL;
      return;
    }
    onTutup();
    // Memberi tahu bagian lain (navbar, pop-up Daftar Program) bahwa login berhasil.
    document.dispatchEvent(new CustomEvent<User>("peri:login", { detail: user }));
  };

  const masuk = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const email = lEmail.trim();
    if (!EMAIL_RE.test(email)) return setLPesan({ teks: "Masukkan email yang valid.", ok: false });
    if (!lSandi) return setLPesan({ teks: "Masukkan kata sandi.", ok: false });
    setMengirim(true);
    const r = await authApi.login({ email, password: lSandi });
    setMengirim(false);
    if (!r.ok) return setLPesan({ teks: r.error, ok: false });
    selesai(r.data.user);
  };

  const daftar = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const email = rEmail.trim();
    const kode = rKode.trim();
    if (!EMAIL_RE.test(email)) return setRPesan({ teks: "Masukkan email yang valid.", ok: false });
    if (!kode) return setRPesan({ teks: "Masukkan kode verifikasi.", ok: false });
    if (rSandi.length < 8 || rSandi.length > 30) return setRPesan({ teks: "Kata sandi 8–30 karakter.", ok: false });
    if (rSandi !== rSandi2) return setRPesan({ teks: "Kata sandi tidak sama.", ok: false });
    setMengirim(true);
    const r = await authApi.register({ email, kode, password: rSandi });
    setMengirim(false);
    if (!r.ok) return setRPesan({ teks: r.error, ok: false });
    selesai(r.data.user);
  };

  const kirimUlang = async (): Promise<void> => {
    const email = rEmail.trim();
    if (!EMAIL_RE.test(email)) return setRPesan({ teks: "Masukkan email yang valid.", ok: false });
    setKirimUlangMati(true);
    const r = await authApi.kirimKode(email);
    setRPesan({ teks: r.ok ? (r.data.pesan ?? "Kode verifikasi dikirim.") : r.error, ok: r.ok });
    setTimeout(() => setKirimUlangMati(false), r.ok ? 60000 : 2000);
  };

  return (
    <div
      ref={wadah}
      className="auth-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onTutup();
      }}
    >
      {/* Masuk */}
      <div className="auth-card auth-card-login" data-view="login" hidden={tampilan !== "login"} role="dialog" aria-modal="true" aria-labelledby="auth-title-login">
        <Kepala top={0} logoGagal={logoGagal} onGagal={() => setLogoGagal(true)} />
        <Siluet top={83} />
        <p className="auth-title" id="auth-title-login" style={{ top: 117 }}>Account Log In</p>
        <form className="auth-form" noValidate data-form="login" onSubmit={masuk}>
          <KolomAuth id="auth-l-email" type="email" placeholder="Email" top={149} autoComplete="email" nilai={lEmail} onUbah={(v) => { setLEmail(v); setLPesan(KOSONG); }} />
          <KolomAuth id="auth-l-pass" type="password" placeholder="Enter password" top={210} autoComplete="current-password" nilai={lSandi} onUbah={(v) => { setLSandi(v); setLPesan(KOSONG); }} />
          <p className={"auth-msg" + (lPesan.ok ? " ok" : "")} style={{ top: 253 }} role="alert">{lPesan.teks}</p>
          <button type="submit" className="auth-submit" style={{ top: 273 }} disabled={mengirim}>Log In</button>
        </form>
        <button type="button" className="auth-link" style={{ left: 62, top: 312 }} onClick={() => onUbahTampilan("register")}>Register Now</button>
        <button type="button" className="auth-link" style={{ left: 187, top: 312 }} data-nolink="">Forgot Password?</button>
        <p className="auth-more" style={{ top: 351 }}>More Login Methods</p>
        <button type="button" className="auth-google" style={{ top: 369 }} aria-label="Masuk dengan Google" data-nolink=""><IkonGoogle /></button>
      </div>

      {/* Daftar */}
      <div className="auth-card auth-card-register" data-view="register" hidden={tampilan !== "register"} role="dialog" aria-modal="true" aria-labelledby="auth-title-register">
        <Kepala top={25} logoGagal={logoGagal} onGagal={() => setLogoGagal(true)} />
        <Siluet top={164} />
        <p className="auth-title" id="auth-title-register" style={{ top: 113 }}>Register</p>
        <form className="auth-form" noValidate data-form="register" onSubmit={daftar}>
          <KolomAuth id="auth-r-email" type="email" placeholder="Email" top={137} autoComplete="email" nilai={rEmail} onUbah={(v) => { setREmail(v); setRPesan(KOSONG); }} />
          <KolomAuth id="auth-r-code" type="text" placeholder="Verification Code" top={192} nilai={rKode} onUbah={(v) => { setRKode(v); setRPesan(KOSONG); }} kirimUlang={{ onKlik: () => void kirimUlang(), mati: kirimUlangMati }} />
          <KolomAuth id="auth-r-pass" type="password" placeholder="Enter password" top={247} autoComplete="new-password" nilai={rSandi} onUbah={(v) => { setRSandi(v); setRPesan(KOSONG); }} />
          <KolomAuth id="auth-r-pass2" type="password" placeholder="Confirm password" top={302} autoComplete="new-password" nilai={rSandi2} onUbah={(v) => { setRSandi2(v); setRPesan(KOSONG); }} />
          <p className={"auth-msg" + (rPesan.ok ? " ok" : "")} style={{ top: 341 }} role="alert">{rPesan.teks}</p>
          <button type="submit" className="auth-submit" style={{ top: 360 }} disabled={mengirim}>Log In</button>
        </form>
        <p className="auth-have" style={{ top: 401 }}>
          Already have an account?{" "}
          <button type="button" className="auth-link-inline" onClick={() => onUbahTampilan("login")}>Log In</button>
        </p>
        <p className="auth-more" style={{ top: 442 }}>More Login Methods</p>
        <button type="button" className="auth-google" style={{ top: 463 }} aria-label="Daftar dengan Google" data-nolink=""><IkonGoogle /></button>
      </div>
    </div>
  );
}