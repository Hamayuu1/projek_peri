import type { UmpanBalikDisetujui } from "../../scripts/types";

/* Isi daftar ini hanya umpan balik yang SUDAH ditinjau admin dan diizinkan tampil
   oleh penulisnya. Tiga entri di bawah adalah CONTOH TAMPILAN (contoh: true) dan di
   halaman diberi label "Contoh". Ganti dengan umpan balik asli, lalu hapus `contoh: true`.
   Bila daftar kosong, seluruh bagian "Apa Kata Mereka" tidak ditampilkan. */
export const UMPAN_BALIK_DISETUJUI: UmpanBalikDisetujui[] = [
  {
    nama: "Sari W.",
    program: "Peserta Inkubator Bisnis Perempuan",
    pesan:
      "Pendampingan dari tim PERI membuat saya lebih percaya diri membuka usaha kecil di rumah. Materinya mudah dipahami dan mentornya sabar.",
    bintang: 5,
    contoh: true,
  },
  {
    nama: "Dewi A.",
    program: "Peserta Digital Skill Academy",
    pesan:
      "Kelas desain dan pemasaran digitalnya membantu saya memotret dan memasarkan produk sendiri. Semoga ada lebih banyak sesi lanjutan.",
    bintang: 5,
    contoh: true,
  },
  {
    nama: "Rina M.",
    program: "Peserta Bangkit dan Berdaya",
    pesan:
      "Ruang ceritanya hangat dan aman. Saya merasa didengar, dan saran saya tentang jadwal kegiatan ternyata ditindaklanjuti.",
    bintang: 5,
    contoh: true,
  },
];