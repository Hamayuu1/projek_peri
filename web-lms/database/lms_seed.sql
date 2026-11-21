-- DATA CONTOH LMS PERI (untuk pengembangan/demo). JANGAN dipakai di server sungguhan.
-- Jalankan SETELAH lms_schema.sql. Aman dijalankan ulang (REPLACE / ON DUPLICATE KEY).
-- Tanggal sesi dan tugas dibuat relatif terhadap HARI IMPOR (CURDATE), jadi kalender selalu terlihat hidup.
USE peri_lms;

-- 1) Akun (kata sandi disimpan sebagai hash, bukan teks biasa)
INSERT INTO users (email, password_hash, role) VALUES ('admin@gmail.com', '$2y$10$gAvxYG8gWV7NP4uYF5iDaOd4W5zpjLQla3NPOjdCkWah2qwjsJfAq', 'admin')
ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role='admin';
INSERT INTO users (email, password_hash, role) VALUES ('peserta@gmail.com', '$2y$10$mDKXcoi2fkb9X9MuGV..iOJU5CNXfJUjAbWUaztHR4EyInCDqvfim', 'peserta')
ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash);
INSERT INTO users (email, password_hash, role) VALUES ('sari@contoh.id', '$2y$10$mYUYbLfiRZcsIslOz7wjveqOEClllUfsSH4zA.bO5bm8Ee1YlN47a', 'peserta')
ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash);
INSERT INTO users (email, password_hash, role) VALUES ('dewi@contoh.id', '$2y$10$mXNaZsOFXEvWJ9aHZD9eiOUVG10.5.kENtVdgBlIk8Av2e9CouwSG', 'peserta')
ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash);
INSERT INTO users (email, password_hash, role) VALUES ('rina@contoh.id', '$2y$10$88cBFCrqSR5m7yiSTjxYD.XbEcg04XKQ.mHTy3Qh3rbLOppbdWv4O', 'peserta')
ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash);
INSERT INTO users (email, password_hash, role) VALUES ('maya@contoh.id', '$2y$10$doMMpchege2Y0l/fSplzAOdEhjfgYyDa3fLKnzu3P5R20UxTzuByG', 'peserta')
ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash);
INSERT INTO users (email, password_hash, role) VALUES ('nur@contoh.id', '$2y$10$V8H6cClZ6.U9fV6wWnRJZOmmHG3TAqc0vtHLJDXTx3k9P4HUEmpqu', 'peserta')
ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash);
INSERT INTO users (email, password_hash, role) VALUES ('fitri@contoh.id', '$2y$10$VXxZ7l/TQ6Gjsj47NMeXG.Oq6yxbWVyNKmsEZQtVh0CPPelvZUyNK', 'peserta')
ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash);
INSERT INTO users (email, password_hash, role) VALUES ('lilis@contoh.id', '$2y$10$5Ovrwicj8jK/hjySWpqxBOM8ZA4WgqJvt4kBHSXgLQMoey0NpwtAO', 'peserta')
ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash);

-- 2) Profil peserta (nama lengkap = nama yang tercetak di sertifikat)
REPLACE INTO lms_profil (user_id, nama_lengkap, umur) VALUES ((SELECT id FROM users WHERE email='peserta@gmail.com'), 'Aditya Setiawan Sahir', NULL);
REPLACE INTO lms_profil (user_id, nama_lengkap, umur) VALUES ((SELECT id FROM users WHERE email='sari@contoh.id'), 'Sari Wulandari', NULL);
REPLACE INTO lms_profil (user_id, nama_lengkap, umur) VALUES ((SELECT id FROM users WHERE email='dewi@contoh.id'), 'Dewi Lestari', NULL);
REPLACE INTO lms_profil (user_id, nama_lengkap, umur) VALUES ((SELECT id FROM users WHERE email='rina@contoh.id'), 'Rina Marlina', NULL);
REPLACE INTO lms_profil (user_id, nama_lengkap, umur) VALUES ((SELECT id FROM users WHERE email='maya@contoh.id'), 'Maya Putri', NULL);
REPLACE INTO lms_profil (user_id, nama_lengkap, umur) VALUES ((SELECT id FROM users WHERE email='nur@contoh.id'), 'Nur Aini', NULL);
REPLACE INTO lms_profil (user_id, nama_lengkap, umur) VALUES ((SELECT id FROM users WHERE email='fitri@contoh.id'), 'Fitri Handayani', NULL);
REPLACE INTO lms_profil (user_id, nama_lengkap, umur) VALUES ((SELECT id FROM users WHERE email='lilis@contoh.id'), 'Lilis Suryani', NULL);

-- 3) Program
REPLACE INTO lms_program (id, nama, kategori, tujuan, deskripsi, periode, angkatan, kuota, status, kode_kelas, fasilitator, pengumuman) VALUES ('dsa', 'Digital Skill Academy', 'Digital', 'Adaptasi teknologi dan inovasi', 'Peserta belajar memasarkan produk secara digital: dari mengenal digital marketing, membangun identitas diri, sampai membuat konten untuk produk.', 'Triwulanan', 'Triwulan IV 2026', 30, 'buka', 'DSA-IV26', 'Tim fasilitator PERI', 'Mohon membawa laptop atau HP yang sudah terpasang aplikasi desain pada Sesi 4.');
REPLACE INTO lms_program (id, nama, kategori, tujuan, deskripsi, periode, angkatan, kuota, status, kode_kelas, fasilitator, pengumuman) VALUES ('ink', 'Inkubator Bisnis', 'Usaha', 'Menyusun rencana usaha yang siap dijalankan', 'Pendampingan bertahap untuk menyusun gagasan usaha, model bisnis sederhana, hingga perhitungan modal dan harga.', 'Triwulanan', 'Triwulan IV 2026', 25, 'tutup', 'INK-IV26', 'Windy', 'Sesi 2 hari ini dimulai tepat pukul 09.00.');
REPLACE INTO lms_program (id, nama, kategori, tujuan, deskripsi, periode, angkatan, kuota, status, kode_kelas, fasilitator, pengumuman) VALUES ('mkt', 'Pemasaran Produk di Marketplace', 'Digital', 'Peserta mampu berjualan lewat marketplace', 'Membuka toko, memotret produk, dan menulis deskripsi yang menarik pembeli.', 'Sekali jalan', 'Gelombang 1 2026', 30, 'buka', 'MKT26', 'Tim fasilitator PERI', 'Materi akan diunggah menjelang Sesi 1.');
REPLACE INTO lms_program (id, nama, kategori, tujuan, deskripsi, periode, angkatan, kuota, status, kode_kelas, fasilitator, pengumuman) VALUES ('kri', 'Kriya Kreatif Lanjutan', 'Kriya', 'Produk kriya peserta layak jual dan rapi', 'Kelas lanjutan untuk peserta yang sudah punya produk kriya.', 'Sekali jalan', 'Gelombang 1 2026', 20, 'buka', 'KRIYA26', 'Tim fasilitator PERI', 'Selamat bergabung. Materi akan diunggah menjelang Sesi 1.');
REPLACE INTO lms_program (id, nama, kategori, tujuan, deskripsi, periode, angkatan, kuota, status, kode_kelas, fasilitator, pengumuman) VALUES ('lit', 'Literasi Keuangan Usaha', 'Keuangan', 'Peserta mampu mencatat dan mengatur keuangan usahanya', 'Belajar mencatat keuangan usaha, memisahkan uang pribadi dan usaha, serta menyusun anggaran.', 'Sekali jalan', 'Gelombang 1 2026', 40, 'buka', 'LITKEU26', 'Tim fasilitator PERI', 'Selamat bergabung. Siapkan buku catatan sederhana.');
REPLACE INTO lms_program (id, nama, kategori, tujuan, deskripsi, periode, angkatan, kuota, status, kode_kelas, fasilitator, pengumuman) VALUES ('kep', 'Kepemimpinan Perempuan', 'Kepemimpinan', 'Peserta percaya diri memimpin kelompok', 'Berlatih memimpin kelompok usaha dan berbicara di depan umum.', 'Sekali jalan', 'Gelombang 1 2027', 25, 'segera', 'KEPEM27', 'Tim fasilitator PERI', NULL);

-- 4) Sesi
REPLACE INTO lms_sesi (id, program_id, no, judul, tanggal, jam_mulai, jam_selesai, mode, tempat, materi_nama, materi_kb) VALUES ('dsa1', 'dsa', 1, 'Pengenalan Digital Marketing', DATE_ADD(CURDATE(), INTERVAL -19 DAY), '09:00:00', '12:00:00', 'Luring', 'Aula 2', 'pengenalan-digital-marketing.pdf', 1240);
REPLACE INTO lms_sesi (id, program_id, no, judul, tanggal, jam_mulai, jam_selesai, mode, tempat, materi_nama, materi_kb) VALUES ('dsa2', 'dsa', 2, 'Self Branding', DATE_ADD(CURDATE(), INTERVAL -12 DAY), '09:00:00', '12:00:00', 'Luring', 'Aula 2', 'self-branding.pdf', 980);
REPLACE INTO lms_sesi (id, program_id, no, judul, tanggal, jam_mulai, jam_selesai, mode, tempat, materi_nama, materi_kb) VALUES ('dsa3', 'dsa', 3, 'Content creator untuk Produk', DATE_ADD(CURDATE(), INTERVAL -5 DAY), '09:00:00', '12:00:00', 'Daring', 'Tautan kelas', 'content-creator-produk.pdf', 2100);
REPLACE INTO lms_sesi (id, program_id, no, judul, tanggal, jam_mulai, jam_selesai, mode, tempat, materi_nama, materi_kb) VALUES ('dsa4', 'dsa', 4, 'Media sosial untuk pemasaran', DATE_ADD(CURDATE(), INTERVAL 2 DAY), '09:00:00', '12:00:00', 'Luring', 'Aula 2', NULL, NULL);
REPLACE INTO lms_sesi (id, program_id, no, judul, tanggal, jam_mulai, jam_selesai, mode, tempat, materi_nama, materi_kb) VALUES ('dsa5', 'dsa', 5, 'Praktik memasarkan produk', DATE_ADD(CURDATE(), INTERVAL 9 DAY), '09:00:00', '12:00:00', 'Daring', 'Tautan kelas', NULL, NULL);
REPLACE INTO lms_sesi (id, program_id, no, judul, tanggal, jam_mulai, jam_selesai, mode, tempat, materi_nama, materi_kb) VALUES ('ink1', 'ink', 1, 'Menemukan gagasan usaha', DATE_ADD(CURDATE(), INTERVAL -7 DAY), '09:00:00', '11:00:00', 'Luring', 'Aula 1', 'gagasan-usaha.pdf', 760);
REPLACE INTO lms_sesi (id, program_id, no, judul, tanggal, jam_mulai, jam_selesai, mode, tempat, materi_nama, materi_kb) VALUES ('ink2', 'ink', 2, 'Model bisnis sederhana', DATE_ADD(CURDATE(), INTERVAL 0 DAY), '09:00:00', '11:00:00', 'Luring', 'Aula 1', 'model-bisnis.pdf', 1100);
REPLACE INTO lms_sesi (id, program_id, no, judul, tanggal, jam_mulai, jam_selesai, mode, tempat, materi_nama, materi_kb) VALUES ('ink3', 'ink', 3, 'Menghitung modal dan harga jual', DATE_ADD(CURDATE(), INTERVAL 7 DAY), '09:00:00', '11:00:00', 'Daring', 'Tautan kelas', NULL, NULL);
REPLACE INTO lms_sesi (id, program_id, no, judul, tanggal, jam_mulai, jam_selesai, mode, tempat, materi_nama, materi_kb) VALUES ('ink4', 'ink', 4, 'Presentasi rencana usaha', DATE_ADD(CURDATE(), INTERVAL 14 DAY), '09:00:00', '11:00:00', 'Luring', 'Aula 1', NULL, NULL);
REPLACE INTO lms_sesi (id, program_id, no, judul, tanggal, jam_mulai, jam_selesai, mode, tempat, materi_nama, materi_kb) VALUES ('mkt1', 'mkt', 1, 'Membuka toko di marketplace', DATE_ADD(CURDATE(), INTERVAL 28 DAY), '09:00:00', '12:00:00', 'Daring', 'Tautan kelas', NULL, NULL);
REPLACE INTO lms_sesi (id, program_id, no, judul, tanggal, jam_mulai, jam_selesai, mode, tempat, materi_nama, materi_kb) VALUES ('mkt2', 'mkt', 2, 'Foto dan deskripsi produk', DATE_ADD(CURDATE(), INTERVAL 35 DAY), '09:00:00', '12:00:00', 'Daring', 'Tautan kelas', NULL, NULL);
REPLACE INTO lms_sesi (id, program_id, no, judul, tanggal, jam_mulai, jam_selesai, mode, tempat, materi_nama, materi_kb) VALUES ('kri1', 'kri', 1, 'Standar mutu produk kriya', DATE_ADD(CURDATE(), INTERVAL 16 DAY), '09:00:00', '11:00:00', 'Luring', 'Aula 2', NULL, NULL);
REPLACE INTO lms_sesi (id, program_id, no, judul, tanggal, jam_mulai, jam_selesai, mode, tempat, materi_nama, materi_kb) VALUES ('kri2', 'kri', 2, 'Kemasan dan foto produk', DATE_ADD(CURDATE(), INTERVAL 23 DAY), '09:00:00', '11:00:00', 'Luring', 'Aula 2', NULL, NULL);
REPLACE INTO lms_sesi (id, program_id, no, judul, tanggal, jam_mulai, jam_selesai, mode, tempat, materi_nama, materi_kb) VALUES ('lit1', 'lit', 1, 'Mencatat uang masuk dan keluar', DATE_ADD(CURDATE(), INTERVAL 4 DAY), '13:00:00', '15:00:00', 'Daring', 'Tautan kelas', NULL, NULL);
REPLACE INTO lms_sesi (id, program_id, no, judul, tanggal, jam_mulai, jam_selesai, mode, tempat, materi_nama, materi_kb) VALUES ('lit2', 'lit', 2, 'Menyusun anggaran bulanan', DATE_ADD(CURDATE(), INTERVAL 11 DAY), '13:00:00', '15:00:00', 'Daring', 'Tautan kelas', NULL, NULL);

-- 5) Peserta yang tergabung di program
REPLACE INTO lms_peserta_program (program_id, user_id, status, bergabung_pada, selesai_pada) VALUES ('dsa', (SELECT id FROM users WHERE email='peserta@gmail.com'), 'aktif', NOW(), NULL);
REPLACE INTO lms_peserta_program (program_id, user_id, status, bergabung_pada, selesai_pada) VALUES ('dsa', (SELECT id FROM users WHERE email='sari@contoh.id'), 'aktif', NOW(), NULL);
REPLACE INTO lms_peserta_program (program_id, user_id, status, bergabung_pada, selesai_pada) VALUES ('dsa', (SELECT id FROM users WHERE email='dewi@contoh.id'), 'aktif', NOW(), NULL);
REPLACE INTO lms_peserta_program (program_id, user_id, status, bergabung_pada, selesai_pada) VALUES ('dsa', (SELECT id FROM users WHERE email='rina@contoh.id'), 'aktif', NOW(), NULL);
REPLACE INTO lms_peserta_program (program_id, user_id, status, bergabung_pada, selesai_pada) VALUES ('dsa', (SELECT id FROM users WHERE email='maya@contoh.id'), 'aktif', NOW(), NULL);
REPLACE INTO lms_peserta_program (program_id, user_id, status, bergabung_pada, selesai_pada) VALUES ('dsa', (SELECT id FROM users WHERE email='nur@contoh.id'), 'aktif', NOW(), NULL);
REPLACE INTO lms_peserta_program (program_id, user_id, status, bergabung_pada, selesai_pada) VALUES ('dsa', (SELECT id FROM users WHERE email='fitri@contoh.id'), 'aktif', NOW(), NULL);
REPLACE INTO lms_peserta_program (program_id, user_id, status, bergabung_pada, selesai_pada) VALUES ('ink', (SELECT id FROM users WHERE email='peserta@gmail.com'), 'aktif', NOW(), NULL);
REPLACE INTO lms_peserta_program (program_id, user_id, status, bergabung_pada, selesai_pada) VALUES ('ink', (SELECT id FROM users WHERE email='dewi@contoh.id'), 'aktif', NOW(), NULL);
REPLACE INTO lms_peserta_program (program_id, user_id, status, bergabung_pada, selesai_pada) VALUES ('ink', (SELECT id FROM users WHERE email='maya@contoh.id'), 'aktif', NOW(), NULL);
REPLACE INTO lms_peserta_program (program_id, user_id, status, bergabung_pada, selesai_pada) VALUES ('ink', (SELECT id FROM users WHERE email='lilis@contoh.id'), 'aktif', NOW(), NULL);
REPLACE INTO lms_peserta_program (program_id, user_id, status, bergabung_pada, selesai_pada) VALUES ('kri', (SELECT id FROM users WHERE email='rina@contoh.id'), 'aktif', NOW(), NULL);
REPLACE INTO lms_peserta_program (program_id, user_id, status, bergabung_pada, selesai_pada) VALUES ('kri', (SELECT id FROM users WHERE email='nur@contoh.id'), 'aktif', NOW(), NULL);
REPLACE INTO lms_peserta_program (program_id, user_id, status, bergabung_pada, selesai_pada) VALUES ('lit', (SELECT id FROM users WHERE email='sari@contoh.id'), 'aktif', NOW(), NULL);

-- 6) Kehadiran
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('dsa1', (SELECT id FROM users WHERE email='peserta@gmail.com'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -19 DAY), '12:00:00'));
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('dsa1', (SELECT id FROM users WHERE email='sari@contoh.id'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -19 DAY), '12:00:00'));
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('dsa1', (SELECT id FROM users WHERE email='dewi@contoh.id'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -19 DAY), '12:00:00'));
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('dsa1', (SELECT id FROM users WHERE email='rina@contoh.id'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -19 DAY), '12:00:00'));
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('dsa1', (SELECT id FROM users WHERE email='maya@contoh.id'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -19 DAY), '12:00:00'));
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('dsa1', (SELECT id FROM users WHERE email='nur@contoh.id'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -19 DAY), '12:00:00'));
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('dsa2', (SELECT id FROM users WHERE email='peserta@gmail.com'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -12 DAY), '12:00:00'));
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('dsa2', (SELECT id FROM users WHERE email='sari@contoh.id'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -12 DAY), '12:00:00'));
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('dsa2', (SELECT id FROM users WHERE email='dewi@contoh.id'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -12 DAY), '12:00:00'));
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('dsa2', (SELECT id FROM users WHERE email='maya@contoh.id'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -12 DAY), '12:00:00'));
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('dsa2', (SELECT id FROM users WHERE email='nur@contoh.id'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -12 DAY), '12:00:00'));
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('dsa2', (SELECT id FROM users WHERE email='fitri@contoh.id'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -12 DAY), '12:00:00'));
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('dsa3', (SELECT id FROM users WHERE email='peserta@gmail.com'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '12:00:00'));
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('dsa3', (SELECT id FROM users WHERE email='sari@contoh.id'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '12:00:00'));
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('dsa3', (SELECT id FROM users WHERE email='rina@contoh.id'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '12:00:00'));
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('dsa3', (SELECT id FROM users WHERE email='maya@contoh.id'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '12:00:00'));
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('dsa3', (SELECT id FROM users WHERE email='fitri@contoh.id'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '12:00:00'));
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('ink1', (SELECT id FROM users WHERE email='peserta@gmail.com'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -7 DAY), '12:00:00'));
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('ink1', (SELECT id FROM users WHERE email='dewi@contoh.id'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -7 DAY), '12:00:00'));
REPLACE INTO lms_kehadiran (sesi_id, user_id, dicatat_pada) VALUES ('ink1', (SELECT id FROM users WHERE email='lilis@contoh.id'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -7 DAY), '12:00:00'));

-- 7) Tugas dan pengumpulan
REPLACE INTO lms_tugas (id, program_id, sesi_no, judul, tenggat, deskripsi) VALUES ('dsa-t1', 'dsa', 1, 'Analisis akun kompetitor', DATE_ADD(CURDATE(), INTERVAL -12 DAY), 'Pilih 2 akun usaha sejenis di media sosial. Tuliskan apa yang menarik dari konten dan cara mereka berjualan.');
REPLACE INTO lms_tugas (id, program_id, sesi_no, judul, tenggat, deskripsi) VALUES ('dsa-t2', 'dsa', 2, 'Rancangan identitas visual', DATE_ADD(CURDATE(), INTERVAL -5 DAY), 'Buat logo sederhana dan pilihan warna untuk produk Anda.');
REPLACE INTO lms_tugas (id, program_id, sesi_no, judul, tenggat, deskripsi) VALUES ('dsa-t3', 'dsa', 3, 'Tiga konten untuk produk', DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'Buat tiga contoh konten (foto atau video pendek) untuk produk Anda lalu unggah dalam satu berkas.');
REPLACE INTO lms_tugas (id, program_id, sesi_no, judul, tenggat, deskripsi) VALUES ('dsa-t4', 'dsa', 4, 'Rencana kalender konten', DATE_ADD(CURDATE(), INTERVAL 9 DAY), 'Susun rencana konten untuk dua minggu ke depan.');
REPLACE INTO lms_pengumpulan (tugas_id, user_id, nama_berkas, catatan, dikumpul_pada) VALUES ('dsa-t1', (SELECT id FROM users WHERE email='peserta@gmail.com'), 'analisis-kompetitor.pdf', NULL, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -13 DAY), '20:15:00'));
REPLACE INTO lms_pengumpulan (tugas_id, user_id, nama_berkas, catatan, dikumpul_pada) VALUES ('dsa-t1', (SELECT id FROM users WHERE email='sari@contoh.id'), 'kompetitor-sari.docx', NULL, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -12 DAY), '08:10:00'));
REPLACE INTO lms_pengumpulan (tugas_id, user_id, nama_berkas, catatan, dikumpul_pada) VALUES ('dsa-t1', (SELECT id FROM users WHERE email='dewi@contoh.id'), 'analisis-dewi.pdf', NULL, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -14 DAY), '19:00:00'));
REPLACE INTO lms_pengumpulan (tugas_id, user_id, nama_berkas, catatan, dikumpul_pada) VALUES ('dsa-t1', (SELECT id FROM users WHERE email='maya@contoh.id'), 'maya-analisis.pdf', NULL, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -12 DAY), '07:45:00'));
REPLACE INTO lms_pengumpulan (tugas_id, user_id, nama_berkas, catatan, dikumpul_pada) VALUES ('dsa-t2', (SELECT id FROM users WHERE email='peserta@gmail.com'), 'identitas-visual.png', NULL, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -6 DAY), '21:40:00'));
REPLACE INTO lms_pengumpulan (tugas_id, user_id, nama_berkas, catatan, dikumpul_pada) VALUES ('dsa-t2', (SELECT id FROM users WHERE email='sari@contoh.id'), 'logo-sari.png', NULL, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '09:00:00'));
REPLACE INTO lms_pengumpulan (tugas_id, user_id, nama_berkas, catatan, dikumpul_pada) VALUES ('dsa-t2', (SELECT id FROM users WHERE email='nur@contoh.id'), 'nur-branding.pdf', NULL, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -6 DAY), '18:20:00'));
REPLACE INTO lms_tugas (id, program_id, sesi_no, judul, tenggat, deskripsi) VALUES ('ink-t1', 'ink', 1, 'Tulis gagasan usaha', DATE_ADD(CURDATE(), INTERVAL -1 DAY), 'Tuliskan satu gagasan usaha, siapa pembelinya, dan apa masalah yang dibantu.');
REPLACE INTO lms_tugas (id, program_id, sesi_no, judul, tenggat, deskripsi) VALUES ('ink-t2', 'ink', 2, 'Isi lembar model bisnis', DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'Lengkapi lembar model bisnis sederhana yang dibagikan pada Sesi 2.');
REPLACE INTO lms_pengumpulan (tugas_id, user_id, nama_berkas, catatan, dikumpul_pada) VALUES ('ink-t1', (SELECT id FROM users WHERE email='peserta@gmail.com'), 'gagasan-usaha.docx', NULL, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -2 DAY), '19:05:00'));
REPLACE INTO lms_pengumpulan (tugas_id, user_id, nama_berkas, catatan, dikumpul_pada) VALUES ('ink-t1', (SELECT id FROM users WHERE email='dewi@contoh.id'), 'gagasan-dewi.pdf', NULL, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -1 DAY), '10:00:00'));

-- 8) Pendaftaran program dan undangan
DELETE FROM lms_pendaftaran; DELETE FROM lms_undangan;
INSERT INTO lms_pendaftaran (user_id, program_id, status, alasan, created_at) VALUES ((SELECT id FROM users WHERE email='peserta@gmail.com'), 'mkt', 'menunggu', NULL, DATE_ADD(CURDATE(), INTERVAL 0 DAY));
INSERT INTO lms_pendaftaran (user_id, program_id, status, alasan, created_at) VALUES ((SELECT id FROM users WHERE email='lilis@contoh.id'), 'mkt', 'menunggu', NULL, DATE_ADD(CURDATE(), INTERVAL -1 DAY));
INSERT INTO lms_pendaftaran (user_id, program_id, status, alasan, created_at) VALUES ((SELECT id FROM users WHERE email='nur@contoh.id'), 'mkt', 'menunggu', NULL, DATE_ADD(CURDATE(), INTERVAL -1 DAY));
INSERT INTO lms_pendaftaran (user_id, program_id, status, alasan, created_at) VALUES ((SELECT id FROM users WHERE email='rina@contoh.id'), 'lit', 'menunggu', NULL, DATE_ADD(CURDATE(), INTERVAL -2 DAY));
INSERT INTO lms_undangan (user_id, program_id, dari, status) VALUES ((SELECT id FROM users WHERE email='peserta@gmail.com'), 'lit', 'Pengurus PERI', 'menunggu');

-- Urutan tampil program
UPDATE lms_program SET urutan = FIELD(id,'dsa','ink','mkt','kri','lit','kep');
