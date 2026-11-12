import type { ProgramInfo } from "../../scripts/types";
import gambar1 from "../../assets/images/program-1.png";
import gambar2 from "../../assets/images/program-2.png";
import gambar3 from "../../assets/images/program-3.png";
import gambar4 from "../../assets/images/program-4.png";

/* Katalog program yang tampil di halaman Program.
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

export const PROGRAM: ProgramKatalog[] = [
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

export function cariProgram(nama: string): ProgramInfo {
  return PROGRAM.find((p) => p.nama === nama) ?? { nama, kategori: "", deskripsi: "", gambar: "" };
}

/** Gulir ke daftar program di halaman. */
export function keDaftarProgram(): void {
  document.getElementById("program-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
}