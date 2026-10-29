// =====================================================================
// DATA PROGRAM PERI — bersumber dari Company Profile PERI, tabel "Program Kerja Perempuan Kreatif Indonesia".
// RESMI : nama_program, tujuan, deskripsi, output, periode.
// TODO (isi dari pengurus PERI):
//   - target_sasaran : tidak ada di company profile.
//   - gambar         : path foto program (taruh file di assets/img/programs/). Jika belum ada, tampil placeholder.
//   - kategori       : usulan peneliti untuk filter di halaman Program.
//   - kriteria       : DRAFT peneliti (usia/pekerjaan/ekonomi/minat/tujuan yang cocok), disusun dari tujuan & deskripsi
//                      program. WAJIB divalidasi pengurus karena menentukan hasil rekomendasi.
// id fitur pada `kriteria` mengacu ke recommendation/features.js.
// =====================================================================
const SEMUA_EKONOMI = ['kurang_mampu', 'menengah', 'mapan'];
const SEMUA_STATUS = ['pelajar', 'irt', 'karyawan', 'wirausaha', 'belum_bekerja', 'lainnya'];
const SEMUA_USIA = ['<=20', '21-35', '36-50', '>50'];
const TODO_TARGET = '[TODO: isi target sasaran resmi dari pengurus PERI]';

export const PROGRAMS = [
  { id: 1, nama_program: 'Bangkit Berdaya', gambar: 'assets/img/programs/bangkit-berdaya.jpg', kategori: 'Pemulihan & Kesehatan Mental', placeholder: false,
    deskripsi: 'Menggabungkan pemulihan trauma, pengembangan diri dan peningkatan harapan.',
    target_sasaran: TODO_TARGET, tujuan: 'Self Healing, Memulihkan Luka, Meraih Asa Perempuan Kuat',
    output: 'Keseimbangan kesehatan mental/emosi & kemandirian ekonomi.', periode: 'Mingguan',
    kriteria: { age: ['21-35', '36-50', '>50'], employment: ['irt', 'belum_bekerja', 'wirausaha', 'lainnya'],
      economic: ['kurang_mampu', 'menengah'], interests: ['kesehatan_mental', 'kesehatan_parenting'],
      goals: ['pemulihan_diri', 'kemandirian_ekonomi'] } },
  { id: 2, nama_program: 'Inkubator Bisnis Perempuan', gambar: 'assets/img/programs/inkubator-bisnis-perempuan.jpg', kategori: 'Kewirausahaan', placeholder: false,
    deskripsi: 'Mentoring dan pendampingan bisnis mikro untuk anggota komunitas.',
    target_sasaran: TODO_TARGET, tujuan: 'Kemandirian ekonomi & inovasi',
    output: 'Terbentuknya bisnis UMKM perempuan yang berkelanjutan.', periode: 'Tahunan',
    kriteria: { age: ['21-35', '36-50'], employment: ['wirausaha', 'irt', 'belum_bekerja', 'karyawan'],
      economic: ['kurang_mampu', 'menengah'], interests: ['kewirausahaan', 'keuangan_usaha'],
      goals: ['kemandirian_ekonomi', 'tambah_keterampilan'] } },
  { id: 3, nama_program: 'Digital Skill Academy', gambar: 'assets/img/programs/digital-skill-academy.jpg', kategori: 'Digital', placeholder: false,
    deskripsi: 'Pelatihan digital marketing, desain grafis, content creation untuk perempuan.',
    target_sasaran: TODO_TARGET, tujuan: 'Adaptasi teknologi & inovasi',
    output: 'Perempuan mampu memasarkan produk secara digital.', periode: 'Triwulanan',
    kriteria: { age: ['<=20', '21-35', '36-50'], employment: ['pelajar', 'wirausaha', 'karyawan', 'belum_bekerja'],
      economic: SEMUA_EKONOMI, interests: ['pemasaran_digital', 'kewirausahaan', 'karya_kreatif'],
      goals: ['tambah_keterampilan', 'promosi_karya', 'kemandirian_ekonomi'] } },
  { id: 4, nama_program: 'Ruang Temu & Kolaborasi', gambar: 'assets/img/programs/ruang-temu-kolaborasi.jpg', kategori: 'Komunitas & Jejaring', placeholder: false,
    deskripsi: 'Sesi diskusi, sharing, dan networking antaranggota dan komunitas lain.',
    target_sasaran: TODO_TARGET, tujuan: 'Sinergi & jaringan antaranggota',
    output: 'Terbentuknya kolaborasi lintas bidang.', periode: 'Bulanan',
    kriteria: { age: ['21-35', '36-50', '>50'], employment: ['karyawan', 'wirausaha', 'irt', 'lainnya'],
      economic: ['menengah', 'mapan'], interests: ['jejaring_kolaborasi', 'literasi_advokasi'],
      goals: ['perluas_jejaring'] } },
  { id: 5, nama_program: 'Festival Perempuan Kreatif', gambar: 'assets/img/programs/festival-perempuan-kreatif.jpg', kategori: 'Event & Promosi Karya', placeholder: false,
    deskripsi: 'Event pameran, talkshow, dan workshop terbuka untuk masyarakat umum.',
    target_sasaran: TODO_TARGET, tujuan: 'Promosi hasil karya & advokasi',
    output: 'Branding komunitas & jangkauan mitra lebih luas.', periode: 'Tahunan',
    kriteria: { age: ['21-35', '36-50'], employment: ['wirausaha', 'karyawan', 'pelajar'],
      economic: SEMUA_EKONOMI, interests: ['karya_kreatif', 'jejaring_kolaborasi', 'pemasaran_digital'],
      goals: ['promosi_karya', 'perluas_jejaring'] } },
  { id: 6, nama_program: 'Perempuan Sehat & Bahagia', gambar: 'assets/img/programs/perempuan-sehat-bahagia.jpg', kategori: 'Pemulihan & Kesehatan Mental', placeholder: false,
    deskripsi: 'Program edukasi kesehatan, parenting, mental health, dan kesehatan reproduksi.',
    target_sasaran: TODO_TARGET, tujuan: 'Kesejahteraan fisik & mental',
    output: 'Perempuan lebih sadar kesehatan dan seimbang.', periode: 'Semesteran',
    kriteria: { age: ['21-35', '36-50', '>50'], employment: ['irt', 'karyawan', 'belum_bekerja', 'lainnya'],
      economic: SEMUA_EKONOMI, interests: ['kesehatan_parenting', 'kesehatan_mental'],
      goals: ['pemulihan_diri'] } },
  { id: 7, nama_program: 'Beasiswa Kreatifitas Anak Perempuan', gambar: 'assets/img/programs/beasiswa-kreatifitas-anak-perempuan.jpg', kategori: 'Pendidikan', placeholder: false,
    deskripsi: 'Bantuan pendidikan dan pelatihan untuk anak perempuan dari keluarga tidak mampu.',
    target_sasaran: TODO_TARGET, tujuan: 'Keberlanjutan & keadilan',
    output: 'Akses pendidikan lebih merata.', periode: 'Tahunan',
    kriteria: { age: ['<=20', '21-35', '36-50'], employment: ['pelajar', 'irt', 'belum_bekerja'],
      economic: ['kurang_mampu'], interests: ['pendidikan_anak'],
      goals: ['bantuan_pendidikan_anak', 'tambah_keterampilan'] } },
  { id: 8, nama_program: 'Podcast Suara Perempuan', gambar: 'assets/img/programs/podcast-suara-perempuan.jpg', kategori: 'Literasi & Advokasi', placeholder: false,
    deskripsi: 'Platform berbagi cerita inspiratif, edukatif, dan aspiratif untuk perempuan.',
    target_sasaran: TODO_TARGET, tujuan: 'Literasi & advokasi',
    output: 'Tumbuhnya kesadaran dan semangat perempuan.', periode: 'Bulanan',
    kriteria: { age: ['<=20', '21-35'], employment: ['pelajar', 'karyawan', 'wirausaha', 'belum_bekerja'],
      economic: SEMUA_EKONOMI, interests: ['literasi_advokasi', 'karya_kreatif'],
      goals: ['kontribusi_sosial', 'perluas_jejaring'] } },
  { id: 9, nama_program: 'Kelas Kreasi Mandiri', gambar: 'assets/img/programs/kelas-kreasi-mandiri.jpg', kategori: 'Keuangan', placeholder: false,
    deskripsi: 'Sistem simpan pinjam berbasis komunitas untuk mendukung usaha kecil anggota.',
    target_sasaran: TODO_TARGET, tujuan: 'Kesejahteraan finansial',
    output: 'Akses permodalan yang adil & mudah.', periode: 'Dalam pengembangan',
    kriteria: { age: ['21-35', '36-50', '>50'], employment: ['wirausaha', 'irt', 'belum_bekerja'],
      economic: ['kurang_mampu', 'menengah'], interests: ['keuangan_usaha', 'kewirausahaan'],
      goals: ['akses_permodalan', 'kemandirian_ekonomi'] } },
  { id: 10, nama_program: 'Gerakan Sosial & Lingkungan', gambar: 'assets/img/programs/gerakan-sosial-lingkungan.jpg', kategori: 'Sosial & Lingkungan', placeholder: false,
    deskripsi: 'Aksi sosial, daur ulang, kegiatan lingkungan berbasis komunitas.',
    target_sasaran: TODO_TARGET, tujuan: 'Keberlanjutan & empati sosial',
    output: 'Perempuan terlibat aktif dalam isu sosial.', periode: 'Triwulanan',
    kriteria: { age: SEMUA_USIA, employment: SEMUA_STATUS, economic: SEMUA_EKONOMI,
      interests: ['sosial_lingkungan', 'jejaring_kolaborasi'], goals: ['kontribusi_sosial', 'perluas_jejaring'] } },
];
