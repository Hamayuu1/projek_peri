import { useEffect, useSyncExternalStore } from "react";
import { API_BASE } from "../../scripts/services/api";
import type { ProgramInfo } from "../../scripts/types";
import gambar1 from "../../assets/images/program-1.png";
import gambar2 from "../../assets/images/program-2.png";
import gambar3 from "../../assets/images/program-3.png";
import gambar4 from "../../assets/images/program-4.png";

/* Katalog program yang tampil di halaman Program.
   Sumber utama: GET /api/program (dikelola admin di panel Kelola program).
   Daftar di bawah (PROGRAM_BAWAAN) hanya cadangan bila server tidak aktif, dan
   menyimpan gambar bawaan situs untuk program yang belum punya foto unggahan.
   Nama program harus sama persis dengan nama yang dipakai mesin rekomendasi
   (peri-rekomendasi/data/programs.js), karena hasil rekomendasi dicocokkan lewat nama. */
export interface ProgramKatalog extends ProgramInfo {
  /** true = disembunyikan sampai tombol "Lihat Program Lainnya" diklik. */
  lebih?: boolean;
}

export const KATEGORI: ReadonlyArray<{ nilai: string; label: string }> = [
  { nilai: "pelatihan", label: "Pelatihan & Pendidikan" },
  { nilai: "bisnis", label: "Ekonomi & Bisnis" },
  { nilai: "kesehatan", label: "Kesehatan & Psikososial" },
  { nilai: "komunitas", label: "Komunitas & Sosial" },
];

export const PROGRAM_BAWAAN: ProgramKatalog[] = [
  { nama: "Bangkit dan Berdaya", kategori: "kesehatan", gambar: gambar1, deskripsi: "Menggabungkan pemulihan trauma, pengembangan diri, dan peningkatan harapan." },
  { nama: "Inkubator Bisnis Perempuan", kategori: "bisnis", gambar: gambar2, deskripsi: "Mentoring dan pendampingan bisnis mikro untuk anggota komunitas." },
  { nama: "Kelas Kreasi Mandiri", kategori: "bisnis", gambar: gambar3, deskripsi: "Sistem simpan pinjam berbasis komunitas untuk mendukung usaha kecil anggota." },
  { nama: "Digital Skill Academy", kategori: "pelatihan", gambar: gambar4, deskripsi: "Pelatihan digital marketing, desain grafis, dan content creation untuk perempuan." },
  { nama: "Ruang Temu & Kolaborasi", kategori: "komunitas", gambar: gambar1, deskripsi: "Sesi diskusi, sharing, dan networking antaranggota dan komunitas lain." },
  { nama: "Perempuan Sehat & Bahagia", kategori: "kesehatan", gambar: gambar2, deskripsi: "Program edukasi kesehatan, parenting, mental health, dan kesehatan reproduksi." },
  { nama: "Beasiswa Kreatifitas Anak Perempuan", kategori: "pelatihan", gambar: gambar3, deskripsi: "Bantuan pendidikan dan pelatihan untuk anak perempuan dari keluarga tidak mampu." },
  { nama: "Podcast Suara Perempuan", kategori: "komunitas", gambar: gambar4, deskripsi: "Platform berbagi cerita inspiratif, edukatif, dan aspiratif untuk perempuan." },
  { nama: "Festival Perempuan Kreatif", kategori: "komunitas", gambar: gambar3, lebih: true, deskripsi: "Event pameran, talkshow, dan workshop terbuka untuk masyarakat umum." },
  { nama: "Gerakan Sosial & Lingkungan", kategori: "komunitas", gambar: gambar4, lebih: true, deskripsi: "Aksi sosial, daur ulang, dan kegiatan lingkungan berbasis komunitas." },
];

const GAMBAR_BAWAAN = [gambar1, gambar2, gambar3, gambar4];
const GAMBAR_PER_NAMA = new Map(PROGRAM_BAWAAN.map((p) => [p.nama, p.gambar]));

interface ProgramApi {
  id: number;
  nama: string;
  kategori: string;
  deskripsi: string;
  gambar: string | null;
  lebih: boolean;
}

interface Keadaan {
  daftar: ProgramKatalog[];
  /** false selama daftar program masih diambil dari server. */
  siap: boolean;
}

let keadaan: Keadaan = { daftar: PROGRAM_BAWAAN, siap: false };
const pendengar = new Set<() => void>();
let janji: Promise<void> | null = null;

function atur(baru: Keadaan): void {
  keadaan = baru;
  pendengar.forEach((f) => f());
}

/** Ambil katalog dari server satu kali; semua komponen berbagi hasilnya. Gagal -> daftar bawaan. */
export function muatProgram(): Promise<void> {
  janji ??= (async () => {
    const batas = new AbortController();
    const timer = setTimeout(() => batas.abort(), 5000);
    try {
      const res = await fetch(`${API_BASE}/api/program`, { signal: batas.signal });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const { program } = (await res.json()) as { program: ProgramApi[] };
      atur({
        siap: true,
        daftar: program.map((p) => ({
          nama: p.nama,
          kategori: p.kategori,
          deskripsi: p.deskripsi,
          lebih: p.lebih,
          gambar: p.gambar
            ? API_BASE + p.gambar
            : (GAMBAR_PER_NAMA.get(p.nama) ?? GAMBAR_BAWAAN[p.id % GAMBAR_BAWAAN.length] ?? ""),
        })),
      });
    } catch {
      atur({ siap: true, daftar: PROGRAM_BAWAAN });
    } finally {
      clearTimeout(timer);
    }
  })();
  return janji;
}

/** Katalog program saat ini (komponen akan dirender ulang begitu data dari server tiba). */
export function usePrograms(): Keadaan {
  useEffect(() => {
    void muatProgram();
  }, []);
  return useSyncExternalStore(
    (f) => {
      pendengar.add(f);
      return () => pendengar.delete(f);
    },
    () => keadaan,
  );
}

/** Katalog saat ini, untuk kode di luar komponen. */
export function daftarSaatIni(): ProgramKatalog[] {
  return keadaan.daftar;
}

export function cariProgram(nama: string): ProgramInfo {
  return keadaan.daftar.find((p) => p.nama === nama) ?? { nama, kategori: "", deskripsi: "", gambar: "" };
}

/** Gulir ke daftar program di halaman. */
export function keDaftarProgram(): void {
  document.getElementById("program-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
}