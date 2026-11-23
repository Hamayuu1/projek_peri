import { useRef, useState } from "react";
import type { UmpanBalikDisetujui } from "../../scripts/types";
import { UMPAN_BALIK_DISETUJUI } from "../data/umpanBalikDisetujui";
import { useReveal } from "../hooks/useReveal";

// Bagian "Apa Kata Mereka" di halaman Umpan Balik.
// Memakai kelas CSS yang sama dengan versi lama (styles/pages/umpan-balik.css).
const TAMPIL_AWAL = 3;
const BINTANG_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function inisial(nama: string): string {
  const kata = nama.replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/);
  return ((kata[0] ?? "?").charAt(0) + (kata[1] ? kata[1].charAt(0) : "")).toUpperCase();
}

function Bintang({ nilai }: { nilai: number }) {
  const n = Math.max(0, Math.min(5, Number(nilai) || 0));
  return (
    <div className="testi-stars" role="img" aria-label={`Penilaian ${n} dari 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={i >= n ? "off" : undefined}>
          <path d={BINTANG_PATH} />
        </svg>
      ))}
    </div>
  );
}

function Kartu({ d }: { d: UmpanBalikDisetujui }) {
  return (
    <article className="testi-card" data-reveal="">
      <div className="testi-card__top">
        <Bintang nilai={d.bintang} />
        {d.contoh && <span className="testi-card__badge">Contoh</span>}
      </div>
      <p className="testi-card__quote">{d.pesan}</p>
      <div className="testi-card__author">
        <div className="testi-card__avatar">{inisial(d.nama)}</div>
        <div>
          <b>{d.nama}</b>
          <span>{d.program}</span>
        </div>
      </div>
    </article>
  );
}

export default function Testimoni() {
  const wadah = useRef<HTMLElement>(null);
  const [semua, setSemua] = useState(false);
  useReveal(wadah);

  if (!UMPAN_BALIK_DISETUJUI.length) return null;
  const tampil = semua ? UMPAN_BALIK_DISETUJUI : UMPAN_BALIK_DISETUJUI.slice(0, TAMPIL_AWAL);

  return (
    <section ref={wadah} className="section section--surface" id="apa-kata-mereka" aria-labelledby="ub-testi">
      <div className="container">
        <div className="section-head" data-reveal="">
          <span className="eyebrow">Umpan Balik dari Pengguna</span>
          <h2 id="ub-testi">Apa Kata Mereka tentang PERI</h2>
          <p>
            Pengalaman peserta dan pengunjung. Hanya umpan balik yang sudah ditinjau dan disetujui admin yang
            ditampilkan di sini.
          </p>
        </div>
        <div className="grid cols-3" id="testi-grid">
          {tampil.map((d) => (
            <Kartu key={d.nama + d.program} d={d} />
          ))}
        </div>
        {UMPAN_BALIK_DISETUJUI.length > TAMPIL_AWAL && (
          <div className="section-action" id="testi-more">
            <button
              type="button"
              className="btn btn--outline"
              id="testi-toggle"
              aria-expanded={semua}
              onClick={() => setSemua(!semua)}
            >
              {semua ? "Tampilkan Lebih Sedikit" : "Lihat Semua Umpan Balik"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}