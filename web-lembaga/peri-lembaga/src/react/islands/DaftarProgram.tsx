import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { authApi, kirimPendaftaranProgram } from "../../scripts/services/api";
import type { ProgramInfo, RingkasanPendaftaran, User } from "../../scripts/types";
import { cariProgram, keDaftarProgram, PROGRAM } from "../data/program";

/* Pop-up Pendaftaran Program (Figma node 160:169, 160:342, 160:418).
   Dipicu tombol [data-daftar-program] di mana pun pada halaman (kartu program, program
   unggulan, atau hasil rekomendasi lewat data-daftar-nama).
   Alur: belum masuk -> pop-up login -> pop-up formulir -> POST /api/pendaftaran-program
         -> tampilan "berhasil" atau "sudah terdaftar".
   Kelas CSS sama dengan versi lama (styles/components/daftar-program.css). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PENDING_MS = 3 * 60 * 1000; // program yang menunggu login berlaku 3 menit

const IKON = {
  x: <path d="M6 6l12 12M18 6L6 18" />,
  chev: <path d="M6 9l6 6 6-6" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v5M12 18h.01" />
    </>
  ),
  check: <path d="M5 12l5 5L20 7" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
} as const;

function Ikon({ nama, tebal = 1.8 }: { nama: keyof typeof IKON; tebal?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={tebal} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {IKON[nama]}
    </svg>
  );
}

/* ---------- Validasi (cermin dari aturan di server) ---------- */
function normalkanWa(nilai: string): string {
  let n = nilai.replace(/[\s\-().]/g, "");
  if (n.startsWith("+62")) n = "0" + n.slice(3);
  else if (n.startsWith("62")) n = "0" + n.slice(2);
  return /^08\d{8,12}$/.test(n) ? n : "";
}

type Tampilan = "form" | "duplikat" | "berhasil";
type Galat = Partial<Record<"dp-nama" | "dp-email" | "dp-wa" | "dp-program" | "dp-setuju", string>>;

function Kepala({ eyebrow, judul }: { eyebrow: string; judul: string }) {
  return (
    <>
      <div className="dp-accent" />
      <div className="dp-head">
        <div>
          <p className="dp-eyebrow">{eyebrow}</p>
          <h2 className="dp-title" id="dp-title">{judul}</h2>
        </div>
        <button type="button" className="dp-close" data-dp-close="" aria-label="Tutup">
          <Ikon nama="x" />
        </button>
      </div>
    </>
  );
}

type KolomProps = { id: string; label: string; wajib?: boolean; hint?: string; galat?: string; children: ReactNode };

function KolomDp({ id, label, wajib = true, hint, galat, children }: KolomProps) {
  return (
    <div className={"dp-field" + (galat ? " has-error" : "")} data-field={id}>
      <label className="dp-label" htmlFor={id}>
        {label}
        {wajib && <b>*</b>}
      </label>
      <div className="dp-input">{children}</div>
      {hint && <p className="dp-hint">{hint}</p>}
      <p className="dp-error">
        <Ikon nama="alert" />
        <span data-msg="">{galat}</span>
      </p>
    </div>
  );
}

type PopupProps = {
  info: ProgramInfo;
  user: User | null;
  tampilan: Tampilan;
  ringkasan: RingkasanPendaftaran | null;
  onTutup: () => void;
  onLain: () => void;
  onTampilan: (t: Tampilan, r: RingkasanPendaftaran) => void;
  onButuhLogin: (info: ProgramInfo) => void;
};

function Popup({ info, user, tampilan, ringkasan, onTutup, onLain, onTampilan, onButuhLogin }: PopupProps) {
  const kotak = useRef<HTMLDivElement>(null);

  // Isian formulir
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [wa, setWa] = useState("");
  const [program, setProgram] = useState(info.nama);
  const [setuju, setSetuju] = useState(false);
  const [galat, setGalat] = useState<Galat>({});
  const [banner, setBanner] = useState("");
  const [mengirim, setMengirim] = useState(false);

  const hapusGalat = (k: keyof Galat): void => {
    setGalat((g) => ({ ...g, [k]: undefined }));
    setBanner("");
  };

  // Fokus awal tiap tampilan.
  useEffect(() => {
    const sasaran = tampilan === "form" ? "#dp-nama" : ".dp-btn.primary";
    kotak.current?.querySelector<HTMLElement>(sasaran)?.focus();
  }, [tampilan]);

  // Esc menutup; Tab berputar di dalam pop-up; gulir halaman dikunci.
  useEffect(() => {
    document.body.classList.add("dp-open");
    const saatTombol = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        onTutup();
      } else if (e.key === "Tab" && kotak.current) {
        const f = kotak.current.querySelectorAll<HTMLElement>(
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
    };
    document.addEventListener("keydown", saatTombol);
    return () => {
      document.body.classList.remove("dp-open");
      document.removeEventListener("keydown", saatTombol);
    };
  }, [onTutup]);

  const kirim = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBanner("");

    const salah: Galat = {};
    if (!nama.trim()) salah["dp-nama"] = "Nama lengkap wajib diisi.";
    if (!EMAIL_RE.test(email.trim())) salah["dp-email"] = "Masukkan email yang valid.";
    if (!normalkanWa(wa.trim())) salah["dp-wa"] = "Nomor WhatsApp tidak valid. Gunakan angka, contoh 081234567890.";
    if (!program) salah["dp-program"] = "Pilih program.";
    if (!setuju) salah["dp-setuju"] = "Centang persetujuan untuk melanjutkan.";
    setGalat(salah);
    const pertama = Object.keys(salah)[0];
    if (pertama) {
      document.getElementById(pertama)?.focus();
      return;
    }

    const body = { program, nama: nama.trim(), email: email.trim(), wa: wa.trim(), setuju };
    setMengirim(true);
    const r = await kirimPendaftaranProgram(body);

    if (r.status === 201) return onTampilan("berhasil", r.data.data ?? body);
    if (r.status === 409) return onTampilan("duplikat", r.data.data ?? body);
    setMengirim(false);
    if (r.status === 401) return onButuhLogin(cariProgram(body.program));

    const peta: Record<string, keyof Galat> = {
      nama: "dp-nama",
      email: "dp-email",
      wa: "dp-wa",
      program: "dp-program",
      setuju: "dp-setuju",
    };
    const idKolom = r.data.kolom ? peta[r.data.kolom] : undefined;
    if (r.status === 400 && idKolom) {
      setGalat({ [idKolom]: r.error });
      document.getElementById(idKolom)?.focus();
    } else {
      setBanner(r.error);
    }
  };

  let isi: ReactNode;
  if (tampilan === "form") {
    isi = (
      <>
        <Kepala eyebrow="Pendaftaran program" judul="Daftar Program" />
        <form noValidate onSubmit={kirim}>
          <div className="dp-body">
            {banner && (
              <div className="dp-alert err">
                <Ikon nama="alert" />
                <div>{banner}</div>
              </div>
            )}
            <KolomDp id="dp-nama" label="Nama lengkap" galat={galat["dp-nama"]}>
              <input id="dp-nama" name="dp-nama" type="text" placeholder="Masukkan nama lengkap Anda" autoComplete="name" maxLength={100} value={nama} onChange={(e) => { setNama(e.target.value); hapusGalat("dp-nama"); }} />
            </KolomDp>
            <KolomDp id="dp-email" label="Email" galat={galat["dp-email"]}>
              <input id="dp-email" name="dp-email" type="email" placeholder="email@gmail.com" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); hapusGalat("dp-email"); }} />
            </KolomDp>
            <KolomDp id="dp-wa" label="Nomor WhatsApp" hint="Konfirmasi pendaftaran dikirim melalui WhatsApp." galat={galat["dp-wa"]}>
              <input id="dp-wa" name="dp-wa" type="tel" placeholder="08xxxxxxxxxx" autoComplete="tel" maxLength={20} value={wa} onChange={(e) => { setWa(e.target.value); hapusGalat("dp-wa"); }} />
            </KolomDp>
            <KolomDp id="dp-program" label="Program" galat={galat["dp-program"]}>
              <select id="dp-program" name="dp-program" value={program} onChange={(e) => { setProgram(e.target.value); hapusGalat("dp-program"); }}>
                {PROGRAM.map((p) => (
                  <option key={p.nama} value={p.nama}>{p.nama}</option>
                ))}
              </select>
              <span className="dp-ico"><Ikon nama="chev" /></span>
            </KolomDp>
            <div className={"dp-field" + (galat["dp-setuju"] ? " has-error" : "")} data-field="dp-setuju">
              <label className="dp-consent">
                <input type="checkbox" id="dp-setuju" checked={setuju} onChange={(e) => { setSetuju(e.target.checked); hapusGalat("dp-setuju"); }} />
                <span className="dp-box"><Ikon nama="check" tebal={2.6} /></span>
                <span>Saya menyetujui data saya digunakan PERI untuk keperluan pendaftaran program ini.</span>
              </label>
              <p className="dp-error">
                <Ikon nama="alert" />
                <span data-msg="">{galat["dp-setuju"]}</span>
              </p>
            </div>
          </div>
          <div className="dp-actions">
            <button type="button" className="dp-btn ghost" data-dp-close="" onClick={onTutup}>Batal</button>
            <button type="submit" className="dp-btn primary" disabled={mengirim}>
              {mengirim ? "Mengirim…" : <>Kirim Pendaftaran <Ikon nama="arrow" /></>}
            </button>
          </div>
        </form>
      </>
    );
  } else if (tampilan === "duplikat" && ringkasan) {
    const p = cariProgram(ringkasan.program || info.nama);
    isi = (
      <>
        <Kepala eyebrow="Pendaftaran program" judul="Daftar Program" />
        <div className="dp-body">
          <div className="dp-alert warn" role="alert">
            <Ikon nama="alert" />
            <div>
              <strong>Anda sudah terdaftar pada program ini</strong>
              Pendaftaran ganda pada program yang sama tidak dapat dilakukan. Pilih program lain atau hubungi PERI bila ada kendala.
            </div>
          </div>
          <div className="dp-program">
            {p.gambar && <img src={p.gambar} alt="" />}
            <div>
              {p.kategori && <span className="dp-badge">{p.kategori}</span>}
              <h3>{p.nama}</h3>
              {p.deskripsi && <p>{p.deskripsi}</p>}
            </div>
          </div>
          <KolomDp id="dp-nama" label="Nama lengkap" wajib={false}>
            <input id="dp-nama" name="dp-nama" type="text" value={ringkasan.nama} readOnly />
          </KolomDp>
          <KolomDp id="dp-email" label="Email" wajib={false}>
            <input id="dp-email" name="dp-email" type="text" value={ringkasan.email} readOnly />
            <span className="dp-ico"><Ikon nama="lock" /></span>
          </KolomDp>
          <KolomDp id="dp-wa" label="Nomor WhatsApp" wajib={false}>
            <input id="dp-wa" name="dp-wa" type="text" value={ringkasan.wa} readOnly />
          </KolomDp>
        </div>
        <div className="dp-actions">
          <button type="button" className="dp-btn ghost" data-dp-close="" onClick={onTutup}>Tutup</button>
          <button type="button" className="dp-btn primary" data-dp-lain="" onClick={onLain}>Lihat Program Lain <Ikon nama="arrow" /></button>
        </div>
      </>
    );
  } else if (tampilan === "berhasil" && ringkasan) {
    const baris = (k: string, v: string): ReactNode => (
      <div>
        <span>{k}</span>
        <b>{v}</b>
      </div>
    );
    isi = (
      <>
        <Kepala eyebrow="Terima kasih" judul="Pendaftaran Terkirim" />
        <div className="dp-body">
          <div className="dp-success">
            <div className="dp-ok"><Ikon nama="check" tebal={2.4} /></div>
            <p>Pendaftaran Anda pada program {ringkasan.program} sudah kami terima. Tim PERI akan mengonfirmasi melalui WhatsApp.</p>
          </div>
          <div className="dp-summary">
            {baris("Program", ringkasan.program)}
            {baris("Nama", ringkasan.nama)}
            {baris("Email", ringkasan.email)}
            {baris("WhatsApp", ringkasan.wa)}
          </div>
        </div>
        <div className="dp-actions">
          <button type="button" className="dp-btn ghost" data-dp-lain="" onClick={onLain}>Lihat Program Lain</button>
          <button type="button" className="dp-btn primary" data-dp-close="" onClick={onTutup}>Selesai</button>
        </div>
      </>
    );
  }

  return (
    <div
      className="dp-overlay"
      onMouseDown={(e) => {
        // Formulir tidak ditutup lewat klik latar agar isian tidak hilang tak sengaja.
        if (e.target === e.currentTarget && tampilan !== "form") onTutup();
      }}
    >
      <div ref={kotak} className="dp-modal" role="dialog" aria-modal="true" aria-labelledby="dp-title">
        {isi}
      </div>
    </div>
  );
}

export default function DaftarProgram() {
  const [terbuka, setTerbuka] = useState<{ info: ProgramInfo; user: User | null } | null>(null);
  const [tampilan, setTampilan] = useState<Tampilan>("form");
  const [ringkasan, setRingkasan] = useState<RingkasanPendaftaran | null>(null);
  const fokusTerakhir = useRef<HTMLElement | null>(null);
  const menunggu = useRef<{ info: ProgramInfo; waktu: number } | null>(null);

  const buka = useCallback((info: ProgramInfo, user: User | null): void => {
    fokusTerakhir.current = document.activeElement as HTMLElement | null;
    setTampilan("form");
    setRingkasan(null);
    setTerbuka({ info, user });
  }, []);

  const tutup = useCallback((): void => {
    setTerbuka(null);
    fokusTerakhir.current?.focus();
  }, []);

  const lihatLain = useCallback((): void => {
    tutup();
    // Tutup tampilan lain yang menutupi daftar program (mis. hasil rekomendasi).
    document.dispatchEvent(new CustomEvent("peri:lihat-program"));
    keDaftarProgram();
  }, [tutup]);

  // Belum masuk: simpan program yang dipilih, buka pop-up login, lanjut setelah login berhasil.
  const butuhLogin = useCallback((info: ProgramInfo): void => {
    menunggu.current = { info, waktu: Date.now() };
    setTerbuka(null);
    window.PERIAuth?.open("login");
  }, []);

  useEffect(() => {
    const saatKlik = (e: MouseEvent): void => {
      const tombol = (e.target as Element | null)?.closest("[data-daftar-program]");
      if (!tombol) return;
      e.preventDefault();
      const nama = tombol.getAttribute("data-daftar-nama") ?? tombol.closest("[data-program-card]")?.getAttribute("data-nama");
      if (!nama) return;
      const info = cariProgram(nama);
      void authApi.me().then((r) => {
        if (r.ok && r.data.user) buka(info, r.data.user);
        else butuhLogin(info);
      });
    };
    // Setelah login berhasil (dikirim pop-up login), lanjutkan ke formulir.
    const saatLogin = (e: CustomEvent<User>): void => {
      const m = menunggu.current;
      menunggu.current = null;
      if (!m || Date.now() - m.waktu > PENDING_MS) return;
      buka(m.info, e.detail);
    };
    document.addEventListener("click", saatKlik);
    document.addEventListener("peri:login", saatLogin);
    return () => {
      document.removeEventListener("click", saatKlik);
      document.removeEventListener("peri:login", saatLogin);
    };
  }, [buka, butuhLogin]);

  if (!terbuka) return null;
  return createPortal(
    <Popup
      key={terbuka.info.nama + (terbuka.user?.email ?? "")}
      info={terbuka.info}
      user={terbuka.user}
      tampilan={tampilan}
      ringkasan={ringkasan}
      onTutup={tutup}
      onLain={lihatLain}
      onTampilan={(t, r) => {
        setRingkasan(r);
        setTampilan(t);
      }}
      onButuhLogin={butuhLogin}
    />,
    document.body,
  );
}