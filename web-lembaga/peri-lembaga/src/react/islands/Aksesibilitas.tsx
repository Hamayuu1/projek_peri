import { useEffect, useId, useRef, useState } from "react";
import { useAksesibilitas } from "../hooks/useAksesibilitas";
import type { Preferensi, UkuranTeks } from "../lib/aksesibilitas";

// Widget aksesibilitas: tombol melayang di kanan bawah dan panel pengaturan.
// Semua pilihan mati secara bawaan. Efeknya ada di styles/aksesibilitas.css.

const UKURAN: { nilai: UkuranTeks; label: string }[] = [
  { nilai: 0, label: "Normal" },
  { nilai: 1, label: "Besar" },
  { nilai: 2, label: "Lebih besar" },
];

const SAKLAR: { kunci: Exclude<keyof Preferensi, "teks">; label: string }[] = [
  { kunci: "kontras", label: "Kontras tinggi" },
  { kunci: "animasi", label: "Kurangi animasi" },
  { kunci: "tautan", label: "Tandai tautan" },
  { kunci: "font", label: "Font mudah dibaca" },
  { kunci: "jarak", label: "Jarak teks" },
  { kunci: "latar", label: "Sembunyikan gambar latar" },
];

function IkonAksesibilitas() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="7.4" r="1.4" fill="currentColor" stroke="none" />
      <path d="M7 10.4c3.2.9 6.8.9 10 0M12 10.8v3.4m0 0-2.4 4.2m2.4-4.2 2.4 4.2" />
    </svg>
  );
}

function IkonTutup() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export default function Aksesibilitas() {
  const { pref, ubah, aturUlang } = useAksesibilitas();
  const [buka, setBuka] = useState(false);
  const akar = useRef<HTMLDivElement>(null);
  const tombol = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const idPanel = useId();
  const idJudul = useId();

  // Fokus ke panel saat dibuka.
  useEffect(() => {
    if (buka) panel.current?.focus();
  }, [buka]);

  // Esc menutup panel dan mengembalikan fokus ke tombol; klik atau fokus di luar juga menutup.
  useEffect(() => {
    if (!buka) return;
    const saatKey = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") return;
      if (document.querySelector(".auth-overlay, .dp-overlay")) return; // pop-up punya Esc sendiri
      setBuka(false);
      tombol.current?.focus();
    };
    const saatKlik = (e: MouseEvent): void => {
      if (akar.current && !akar.current.contains(e.target as Node)) setBuka(false);
    };
    // Fokus keyboard pindah ke luar widget (misalnya dengan Tab): tutup panel.
    const saatFokus = (e: FocusEvent): void => {
      if (akar.current && !akar.current.contains(e.target as Node)) setBuka(false);
    };
    document.addEventListener("keydown", saatKey);
    document.addEventListener("mousedown", saatKlik);
    document.addEventListener("focusin", saatFokus);
    return () => {
      document.removeEventListener("keydown", saatKey);
      document.removeEventListener("mousedown", saatKlik);
      document.removeEventListener("focusin", saatFokus);
    };
  }, [buka]);

  return (
    <div ref={akar} className="a11y-root">
      {buka && (
        <div ref={panel} id={idPanel} className="a11y-panel" role="dialog" aria-labelledby={idJudul} tabIndex={-1}>
          <div className="a11y-head">
            <h2 className="a11y-title" id={idJudul}>Aksesibilitas</h2>
            <button
              type="button"
              className="a11y-close"
              aria-label="Tutup pengaturan aksesibilitas"
              onClick={() => {
                setBuka(false);
                tombol.current?.focus();
              }}
            >
              <IkonTutup />
            </button>
          </div>

          <div className="a11y-group" role="group" aria-labelledby={idJudul + "-teks"}>
            <p className="a11y-label" id={idJudul + "-teks"}>Ukuran teks</p>
            <div className="a11y-seg">
              {UKURAN.map((u) => (
                <button
                  key={u.nilai}
                  type="button"
                  className="a11y-seg-btn"
                  aria-pressed={pref.teks === u.nilai}
                  onClick={() => ubah("teks", u.nilai)}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          <ul className="a11y-list">
            {SAKLAR.map((s) => (
              <li key={s.kunci}>
                <button
                  type="button"
                  role="switch"
                  className="a11y-switch"
                  aria-checked={pref[s.kunci]}
                  onClick={() => ubah(s.kunci, !pref[s.kunci])}
                >
                  <span>{s.label}</span>
                  <span className="a11y-track" aria-hidden="true">
                    <span className="a11y-thumb" />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <button type="button" className="a11y-reset" onClick={aturUlang}>
            Atur ulang
          </button>
        </div>
      )}

      <button
        ref={tombol}
        type="button"
        className="a11y-fab"
        aria-label="Aksesibilitas"
        aria-haspopup="dialog"
        aria-expanded={buka}
        aria-controls={buka ? idPanel : undefined}
        onClick={() => setBuka((b) => !b)}
      >
        <IkonAksesibilitas />
      </button>
    </div>
  );
}