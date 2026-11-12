import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { rekomendasikan, type HasilProgram, type Profil } from "@rekomendasi";
import type { ProgramInfo } from "../../scripts/types";
import { keDaftarProgram, PROGRAM } from "../data/program";

/* Wizard "Temukan Program Anda": 3 langkah isian + hasil rekomendasi.
   Dibuka oleh tombol [data-temukan-program] di halaman Program.
   Rekomendasi dihitung oleh model di ../peri-rekomendasi (content-based filtering,
   Cosine/Euclidean) lewat alias @rekomendasi; model tidak diubah.
   Desain: Figma node 166:371 (Profil), 167:263 (Preferensi), 168:536 (Tujuan).
   Kelas CSS sama dengan versi lama (styles/components/temukan-program.css). */

type JenisOpsi = "kerja" | "ekonomi" | "topik" | "tujuan";
type IdGalat = "usia" | "kerja" | "ekonomi" | "topik" | "tujuan";

interface Jawaban {
  usia: string;
  kerja: string;
  ekonomi: string;
  topik: string[];
  tujuan: string[];
}
interface Rekomendasi {
  p: ProgramInfo;
  hasil: HasilProgram;
  persen: number;
}

/* ---------- Pilihan formulir ----------
   Tiap pilihan punya id yang dipakai model (lihat peri-rekomendasi/recommendation/features.js). */
const KERJA: Record<string, string> = {
  "Pelajar/Mahasiswa": "pelajar",
  "Ibu rumah tangga": "irt",
  Karyawan: "karyawan",
  Wirausaha: "wirausaha",
  "Belum bekerja": "belum_bekerja",
  Lainnya: "lainnya",
};
const EKONOMI: Record<string, string> = {
  "Kurang mampu": "kurang_mampu",
  Menengah: "menengah",
  Mapan: "mapan",
};
const TOPIK: Record<string, string> = {
  "Pemulihan diri dan kesehatan mental": "kesehatan_mental",
  "Literasi dan advokasi": "literasi_advokasi",
  "Bisnis dan Kewirausahaan": "kewirausahaan",
  "Pemasaran digital dan desain": "pemasaran_digital",
  "Jejaring dan kolaborasi": "jejaring_kolaborasi",
  "Kesehatan, parenting dan reproduksi": "kesehatan_parenting",
  "Pendidikan anak perempuan": "pendidikan_anak",
  "Keuangan dan permodalan usaha": "keuangan_usaha",
  "Kegiatan sosial dan lingkungan": "sosial_lingkungan",
  "Karya kreatif dan pameran": "karya_kreatif",
};
const TUJUAN: Record<string, string> = {
  "Memulihkan diri dan menjaga kesehatan": "pemulihan_diri",
  "Mencapai kemandirian ekonomi": "kemandirian_ekonomi",
  "Menambah keterampilan": "tambah_keterampilan",
  "Memperluas jejaring": "perluas_jejaring",
  "Mendapat akses permodalan": "akses_permodalan",
  "Bantuan pendidikan untuk anak": "bantuan_pendidikan_anak",
  "Berkontribusi untuk sosial": "kontribusi_sosial",
  "Mempromosikan hasil karya": "promosi_karya",
};

const USIA_MIN = 10; // batas yang diterima model
const USIA_MAX = 90;

const NAMA_KATEGORI: Record<string, string> = {
  kesehatan: "Kesehatan",
  bisnis: "Bisnis",
  pelatihan: "Pelatihan",
  komunitas: "Komunitas",
};

const AWAL: Jawaban = { usia: "", kerja: "", ekonomi: "", topik: [], tujuan: [] };

/* ---------- Perhitungan rekomendasi ---------- */
function hitung(s: Jawaban): Rekomendasi[] {
  const profil: Profil = {
    age: Number(s.usia),
    employment_status: KERJA[s.kerja] ?? "",
    economic_condition: EKONOMI[s.ekonomi] ?? "",
    interests: s.topik.map((t) => TOPIK[t]).filter((id): id is string => !!id),
    goals: s.tujuan.map((t) => TUJUAN[t]).filter((id): id is string => !!id),
  };
  const { hasil } = rekomendasikan(profil);
  const daftar: Rekomendasi[] = [];
  for (const h of hasil) {
    if (h.score <= 0) continue;
    const p = PROGRAM.find((k) => k.nama === h.program_name);
    if (p) daftar.push({ p, hasil: h, persen: Math.round(h.score * 100) });
  }
  return daftar.slice(0, 4); // 1 utama + hingga 3 program lain
}

/* ---------- Bagian tampilan ---------- */
function Cek() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Penanda({ aktif }: { aktif: number }) {
  return (
    <ol className="tp-steps" aria-label="Langkah">
      {["Profil", "Preferensi", "Tujuan"].map((nama, i) => {
        const no = i + 1;
        const kelas = no === aktif ? "active" : no < aktif ? "done" : "";
        return (
          <li key={nama} className={kelas || undefined} aria-current={no === aktif ? "step" : undefined}>
            <span className="tp-num">{no}</span>
            <span className="tp-label">{nama}</span>
          </li>
        );
      })}
    </ol>
  );
}

type GrupProps = { label: string; bantuan?: string; galat?: string; children: ReactNode; id: IdGalat };

function Grup({ id, label, bantuan, galat, children }: GrupProps) {
  return (
    <div className={"tp-group" + (galat ? " has-error" : "")} data-grup={id}>
      <span className="tp-label">{label}</span>
      {bantuan && <p className="tp-help">{bantuan}</p>}
      {children}
      <p className="tp-error" role="alert">{galat}</p>
    </div>
  );
}

type OpsiProps = {
  daftar: string[];
  terpilih: string | string[];
  multi: boolean;
  onPilih: (nilai: string) => void;
};

function Opsi({ daftar, terpilih, multi, onPilih }: OpsiProps) {
  return (
    <div className="tp-options" role={multi ? "group" : "radiogroup"}>
      {daftar.map((t) => {
        const on = Array.isArray(terpilih) ? terpilih.includes(t) : terpilih === t;
        return (
          <button
            key={t}
            type="button"
            className="tp-option"
            {...(multi ? { "aria-pressed": on } : { role: "radio", "aria-checked": on })}
            onClick={() => onPilih(t)}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

function Hasil({ hasil, onUlang, onSemua }: { hasil: Rekomendasi[]; onUlang: () => void; onSemua: () => void }) {
  const u = hasil[0];
  if (!u) {
    return (
      <div className="tp-card">
        <p>Belum ada program yang cocok dengan pilihan Anda. Silakan lihat semua program.</p>
        <div className="tp-actions">
          <button type="button" className="tp-btn" onClick={onUlang}>Ulangi</button>
          <button type="button" className="tp-btn primary" onClick={onSemua}>Lihat Semua Program</button>
        </div>
      </div>
    );
  }
  const lain = hasil.slice(1);
  const cek = u.hasil.checks.filter((c) => c.ok).map((c) => c.label);

  return (
    <>
      <p className="tp-eyebrow2">Program yang paling sesuai dengan profil Anda</p>
      <section className="tp-main">
        <div className="tp-main-top">
          <div className="tp-main-text">
            <span className="tp-eyebrow">Rekomendasi Utama</span>
            <h3>{u.p.nama}</h3>
            <p>Program ini direkomendasikan karena memiliki karakteristik yang sesuai dengan profil dan tujuan Anda.</p>
          </div>
          {u.p.gambar && <img src={u.p.gambar} alt={u.p.nama} />}
        </div>
        <div className="tp-why">
          <h4>Mengapa program ini direkomendasikan?</h4>
          <ul className="tp-checks">
            {cek.map((t) => (
              <li key={t}><Cek />{t}</li>
            ))}
          </ul>
          <div className="tp-score">
            <b>{u.persen}%</b>
            <span>Tingkat Kesesuaian</span>
          </div>
          <p className="tp-reason">{u.hasil.reason}</p>
        </div>
        <div className="tp-main-act">
          <button type="button" className="tp-btn primary" data-daftar-program="" data-daftar-nama={u.p.nama}>
            Daftar Sekarang
          </button>
        </div>
      </section>

      {lain.length > 0 && (
        <>
          <h3 className="tp-other-title">Program Lain Yang Mungkin Sesuai</h3>
          <div className="tp-results">
            {lain.map((x) => (
              <article key={x.p.nama} className="tp-result">
                {x.p.gambar && <img src={x.p.gambar} alt="" />}
                <div className="tp-body">
                  <div className="tp-meta">
                    <span className="tp-badge">{NAMA_KATEGORI[x.p.kategori] ?? "Program"}</span>
                    <span className="tp-pct">{x.persen}% sesuai</span>
                  </div>
                  <h3>{x.p.nama}</h3>
                  <p>{x.hasil.reason}</p>
                  <button type="button" className="tp-btn-red" data-daftar-program="" data-daftar-nama={x.p.nama}>
                    Daftar Program
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <p className="tp-note">
        Persentase menunjukkan kemiripan profil Anda dengan sasaran tiap program. Ini hanya saran awal; tim PERI dapat
        membantu bila Anda masih ragu.
      </p>
      <div className="tp-actions tp-actions--center">
        <button type="button" className="tp-btn" onClick={onUlang}>Ulangi Analisis</button>
        <button type="button" className="tp-btn primary" onClick={onSemua}>Lihat Semua Program</button>
      </div>
    </>
  );
}

/* ---------- Wizard ---------- */
type WizardProps = { atas: number; onTutup: () => void };

function Wizard({ atas, onTutup }: WizardProps) {
  const lapisan = useRef<HTMLDivElement>(null);
  const halaman = useRef<HTMLDivElement>(null);
  const [langkah, setLangkah] = useState(1); // 1-3 = formulir, 4 = hasil
  const [jawab, setJawab] = useState<Jawaban>(AWAL);
  const [galat, setGalat] = useState<Partial<Record<IdGalat, string>>>({});

  const hasil = useMemo(() => (langkah === 4 ? hitung(jawab) : []), [langkah, jawab]);

  const hapusGalat = (id: IdGalat): void => setGalat((g) => ({ ...g, [id]: undefined }));
  const ulang = (): void => {
    setJawab(AWAL);
    setGalat({});
    setLangkah(1);
  };
  const semua = (): void => {
    onTutup();
    keDaftarProgram();
  };

  // Fokus awal tiap langkah, dan kembali ke atas halaman.
  useEffect(() => {
    if (langkah === 4) halaman.current?.querySelector<HTMLElement>(".tp-btn.primary")?.focus();
    else halaman.current?.querySelector<HTMLElement>("#tp-usia, .tp-option")?.focus({ preventScroll: true });
    lapisan.current?.scrollTo({ top: 0 });
  }, [langkah]);

  // Gulir ke isian yang salah.
  useEffect(() => {
    if (Object.values(galat).some(Boolean)) {
      halaman.current?.querySelector(".has-error")?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [galat]);

  const pilihSatu = (jenis: "kerja" | "ekonomi", nilai: string): void => {
    setJawab((j) => ({ ...j, [jenis]: nilai }));
    hapusGalat(jenis);
  };
  const pilihBanyak = (jenis: "topik" | "tujuan", nilai: string): void => {
    setJawab((j) => {
      const sekarang = j[jenis];
      return { ...j, [jenis]: sekarang.includes(nilai) ? sekarang.filter((x) => x !== nilai) : [...sekarang, nilai] };
    });
    hapusGalat(jenis);
  };

  const lanjut = (): void => {
    const salah: Partial<Record<IdGalat, string>> = {};
    if (langkah === 1) {
      const u = Number(jawab.usia);
      if (!jawab.usia || !Number.isFinite(u) || u < USIA_MIN || u > USIA_MAX || Math.floor(u) !== u) {
        salah.usia = `Masukkan usia dalam angka (${USIA_MIN}–${USIA_MAX}).`;
      }
      if (!jawab.kerja) salah.kerja = "Pilih status pekerjaan Anda.";
      if (!jawab.ekonomi) salah.ekonomi = "Pilih kondisi ekonomi Anda.";
    } else if (langkah === 2 && !jawab.topik.length) {
      salah.topik = "Pilih minimal satu topik.";
    } else if (langkah === 3 && !jawab.tujuan.length) {
      salah.tujuan = "Pilih minimal satu tujuan.";
    }
    setGalat(salah);
    if (Object.keys(salah).length) return;
    setLangkah(langkah + 1);
  };

  let isi: ReactNode;
  if (langkah === 4) {
    isi = <Hasil hasil={hasil} onUlang={ulang} onSemua={semua} />;
  } else {
    isi = (
      <>
        <Penanda aktif={langkah} />
        <div className="tp-card">
          {langkah === 1 && (
            <>
              <div className={"tp-group" + (galat.usia ? " has-error" : "")} data-grup="usia">
                <label className="tp-label" htmlFor="tp-usia">Usia</label>
                <input
                  className="tp-input"
                  id="tp-usia"
                  type="number"
                  inputMode="numeric"
                  min={USIA_MIN}
                  max={USIA_MAX}
                  placeholder="Contoh: 25"
                  value={jawab.usia}
                  onChange={(e) => {
                    setJawab((j) => ({ ...j, usia: e.target.value }));
                    hapusGalat("usia");
                  }}
                />
                <p className="tp-error" role="alert">{galat.usia}</p>
              </div>
              <Grup id="kerja" label="Status Pekerjaan" galat={galat.kerja}>
                <Opsi daftar={Object.keys(KERJA)} terpilih={jawab.kerja} multi={false} onPilih={(n) => pilihSatu("kerja", n)} />
              </Grup>
              <Grup id="ekonomi" label="Kondisi Ekonomi" galat={galat.ekonomi}>
                <Opsi daftar={Object.keys(EKONOMI)} terpilih={jawab.ekonomi} multi={false} onPilih={(n) => pilihSatu("ekonomi", n)} />
              </Grup>
            </>
          )}
          {langkah === 2 && (
            <Grup id="topik" label="Topik apa yang ingin anda pelajari?" bantuan="Pilih satu atau lebih." galat={galat.topik}>
              <Opsi daftar={Object.keys(TOPIK)} terpilih={jawab.topik} multi onPilih={(n) => pilihBanyak("topik", n)} />
            </Grup>
          )}
          {langkah === 3 && (
            <Grup id="tujuan" label="Apa tujuan anda mengikuti program?" bantuan="Pilih satu atau lebih." galat={galat.tujuan}>
              <Opsi daftar={Object.keys(TUJUAN)} terpilih={jawab.tujuan} multi onPilih={(n) => pilihBanyak("tujuan", n)} />
            </Grup>
          )}
          <div className="tp-actions">
            <button type="button" className="tp-btn" onClick={langkah === 1 ? onTutup : () => setLangkah(langkah - 1)}>
              {langkah === 1 ? "Batal" : "Kembali"}
            </button>
            <button type="button" className="tp-btn primary" onClick={lanjut}>
              {langkah === 3 ? "Analisis Profil Saya" : "Lanjut"}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div ref={lapisan} className="tp-overlay" style={{ top: atas }} role="dialog" aria-modal="true" aria-labelledby="tp-title">
      <div ref={halaman} className={"tp-page" + (langkah === 4 ? " wide" : "")}>
        <h2 className="tp-title" id="tp-title">
          {langkah === 4 ? "Hasil Rekomendasi Program" : "Temukan Program Yang Tepat Untuk Anda"}
        </h2>
        {isi}
      </div>
    </div>
  );
}

export default function TemukanProgram() {
  const [atas, setAtas] = useState<number | null>(null); // null = tertutup; angka = posisi atas pop-up
  const fokusTerakhir = useRef<HTMLElement | null>(null);
  const popupLain = useRef(false);

  const tutup = useCallback((): void => {
    setAtas(null);
    fokusTerakhir.current?.focus();
  }, []);

  useEffect(() => {
    const saatKlik = (e: MouseEvent): void => {
      if (!(e.target as Element | null)?.closest("[data-temukan-program]")) return;
      e.preventDefault();
      fokusTerakhir.current = document.activeElement as HTMLElement | null;
      const header = document.querySelector(".site-header");
      setAtas(header ? Math.round(header.getBoundingClientRect().bottom) : 96);
    };
    // Fase capture: catat dulu apakah ada pop-up lain terbuka, sebelum pop-up itu menutup diri.
    const catatEsc = (e: KeyboardEvent): void => {
      if (e.key === "Escape") popupLain.current = !!document.querySelector(".dp-overlay, .auth-overlay");
    };
    const saatEsc = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && !popupLain.current) tutup();
    };
    document.addEventListener("click", saatKlik);
    document.addEventListener("keydown", catatEsc, true);
    document.addEventListener("keydown", saatEsc);
    document.addEventListener("peri:lihat-program", tutup);
    return () => {
      document.removeEventListener("click", saatKlik);
      document.removeEventListener("keydown", catatEsc, true);
      document.removeEventListener("keydown", saatEsc);
      document.removeEventListener("peri:lihat-program", tutup);
    };
  }, [tutup]);

  // Kunci gulir halaman selama wizard terbuka.
  const terbuka = atas !== null;
  useEffect(() => {
    document.body.classList.toggle("tp-open", terbuka);
    return () => document.body.classList.remove("tp-open");
  }, [terbuka]);

  if (atas === null) return null;
  return createPortal(<Wizard atas={atas} onTutup={tutup} />, document.body);
}