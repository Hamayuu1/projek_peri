import { useRef, useState } from "react";
import gambarUnggulan from "../../assets/images/program-1.png";
import { Tombol } from "../components/Tombol";
import { KATEGORI, PROGRAM, type ProgramKatalog } from "../data/program";
import { useReveal } from "../hooks/useReveal";

/* Halaman Program: kolom pencarian dan filter, program unggulan, dan daftar program.
   Markup dan kelas CSS sama dengan versi lama (styles/pages/program.css).
   Semua kartu tetap dirender (yang tersaring hanya diberi atribut hidden) dan membawa
   atribut data-program-card / data-nama / data-kategori, karena wizard "Temukan Program"
   masih membaca katalog dari kartu di halaman. */

function KartuProgram({ p, tersembunyi }: { p: ProgramKatalog; tersembunyi: boolean }) {
  return (
    <article
      className="card col-3"
      data-program-card=""
      data-nama={p.nama}
      data-kategori={p.kategori}
      data-lebih={p.lebih ? "" : undefined}
      data-reveal=""
      hidden={tersembunyi}
    >
      <img className="card-media" src={p.gambar} alt={p.nama} />
      <div className="card-body">
        <h3>{p.nama}</h3>
        <p data-program-desc="">{p.deskripsi}</p>
        <Tombol className="btn--block btn--sm btn-arrow" data-daftar-program="" data-daftar-nama={p.nama}>
          Daftar Program
        </Tombol>
      </div>
    </article>
  );
}

export default function KatalogProgram() {
  const wadah = useRef<HTMLDivElement>(null);
  const [kata, setKata] = useState("");
  const [kategori, setKategori] = useState("");
  const [semua, setSemua] = useState(false);
  useReveal(wadah);

  const kunci = kata.trim().toLowerCase();
  const menyaring = kunci !== "" || kategori !== "";
  const lolos = (p: ProgramKatalog): boolean =>
    p.nama.toLowerCase().includes(kunci) && (!kategori || p.kategori === kategori);
  const adaCocok = PROGRAM.some(lolos);

  return (
    <div ref={wadah} className="react-wadah">
      {/* Pencarian dan filter (8 + 4) */}
      <div className="container pg-search">
        <div className="grid" data-reveal="">
          <label className="pg-field col-8">
            <span className="visually-hidden">Cari program</span>
            <input
              type="text"
              id="search-program"
              placeholder="Cari Program"
              autoComplete="off"
              value={kata}
              onChange={(e) => setKata(e.target.value)}
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </label>
          <label className="pg-field col-4">
            <span className="visually-hidden">Kategori program</span>
            <select id="filter-kategori" value={kategori} onChange={(e) => setKategori(e.target.value)}>
              <option value="">Semua Kategori</option>
              {KATEGORI.map((k) => (
                <option key={k.nilai} value={k.nilai}>
                  {k.label}
                </option>
              ))}
            </select>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </label>
        </div>
      </div>

      {/* Program unggulan (5 + 7) */}
      <section className="section section--sm pg-featured" aria-labelledby="pg-unggulan">
        <div className="container">
          <div className="grid grid--center">
            <div className="media-fill col-5" data-reveal="">
              <img src={gambarUnggulan} alt="Bangkit dan Berdaya" />
            </div>
            <div className="pg-featured-text col-7" data-reveal="">
              <span className="eyebrow">Program Unggulan Kami</span>
              <h2 id="pg-unggulan">Bangkit dan Berdaya</h2>
              <p>
                Menggabungkan pemulihan trauma, pengembangan diri, dan peningkatan harapan. Ikuti program ini bersama
                komunitas PERI di Samarinda.
              </p>
              <Tombol className="btn-arrow" data-daftar-program="" data-daftar-nama="Bangkit dan Berdaya">
                Daftar Program
              </Tombol>
            </div>
          </div>
        </div>
      </section>

      {/* Daftar program (3+3+3+3) */}
      <section className="section section--surface" aria-labelledby="pg-program">
        <div className="container">
          <div className="section-head" data-reveal="">
            <span className="eyebrow">Program Kami</span>
            <h2 id="pg-program">Mewujudkan Perempuan Mandiri dan Berdaya Saing</h2>
          </div>
          <div className="grid" id="program-grid">
            {PROGRAM.map((p) => (
              <KartuProgram key={p.nama} p={p} tersembunyi={!lolos(p) || (!semua && !menyaring && !!p.lebih)} />
            ))}
          </div>
          <p className="pg-empty" id="program-empty" hidden={adaCocok}>
            Tidak ada program yang cocok dengan pencarian Anda.
          </p>
          <div className="section-action" hidden={semua || menyaring}>
            <Tombol className="btn-arrow" data-program-lebih="" onClick={() => setSemua(true)}>
              Lihat Program Lainnya
            </Tombol>
          </div>
        </div>
      </section>
    </div>
  );
}