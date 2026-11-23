-- SKEMA DATABASE LMS PERI (MySQL / MariaDB, Laragon). Berdiri sendiri, tidak bergantung pada web utama.
-- Nanti saat digabung, tabel users dan lms_* ini tinggal disesuaikan dengan milik web lembaga.
-- Urutan: 1) file ini, 2) migrasi_02 sampai migrasi_06 (lihat database/README.md).

CREATE DATABASE IF NOT EXISTS peri_lms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE peri_lms;

-- Akun login. Kata sandi disimpan sebagai hash, bukan teks biasa.
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('peserta','admin') NOT NULL DEFAULT 'peserta',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Profil peserta. nama_lengkap = nama yang tercetak di sertifikat (diisi saat pendaftaran akun).
CREATE TABLE IF NOT EXISTS lms_profil (
  user_id      INT UNSIGNED NOT NULL PRIMARY KEY,
  nama_lengkap VARCHAR(100) NOT NULL,
  umur         TINYINT UNSIGNED NULL,
  CONSTRAINT fk_profil_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lms_program (
  id          VARCHAR(20) NOT NULL PRIMARY KEY,          -- contoh: dsa
  nama        VARCHAR(150) NOT NULL,
  kategori    VARCHAR(40) NOT NULL,
  tujuan      VARCHAR(255) NULL,
  deskripsi   TEXT NULL,
  periode     VARCHAR(40) NULL,
  angkatan    VARCHAR(60) NULL,
  kuota       SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  status      ENUM('segera','buka','tutup') NOT NULL DEFAULT 'segera',
  kode_kelas  VARCHAR(30) NOT NULL UNIQUE,               -- dipakai peserta untuk "Gabung kelas"
  fasilitator VARCHAR(100) NULL,
  pengumuman  TEXT NULL,
  urutan      SMALLINT UNSIGNED NOT NULL DEFAULT 0       -- urutan tampil di aplikasi
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lms_sesi (
  id           VARCHAR(30) NOT NULL PRIMARY KEY,         -- contoh: dsa1
  program_id   VARCHAR(20) NOT NULL,
  no           TINYINT UNSIGNED NOT NULL,
  judul        VARCHAR(150) NOT NULL,
  tanggal      DATE NOT NULL,
  jam_mulai    TIME NOT NULL,
  jam_selesai  TIME NOT NULL,
  mode         ENUM('Luring','Daring') NOT NULL,
  tempat       VARCHAR(120) NULL,
  materi_nama  VARCHAR(190) NULL,                        -- nama berkas materi (berkas disimpan di folder uploads/)
  materi_kb    INT UNSIGNED NULL,
  UNIQUE KEY uq_sesi_no (program_id, no),
  KEY idx_sesi_tanggal (tanggal),
  CONSTRAINT fk_sesi_program FOREIGN KEY (program_id) REFERENCES lms_program (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Peserta yang sudah tergabung di sebuah program (kelas). Aturan "satu program aktif" dijaga oleh aplikasi.
CREATE TABLE IF NOT EXISTS lms_peserta_program (
  program_id     VARCHAR(20) NOT NULL,
  user_id        INT UNSIGNED NOT NULL,
  status         ENUM('aktif','selesai') NOT NULL DEFAULT 'aktif',  -- 'selesai' = ditandai pengurus
  bergabung_pada DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  selesai_pada   DATETIME NULL,
  PRIMARY KEY (program_id, user_id),
  KEY idx_pp_user (user_id),
  CONSTRAINT fk_pp_program FOREIGN KEY (program_id) REFERENCES lms_program (id) ON DELETE CASCADE,
  CONSTRAINT fk_pp_user    FOREIGN KEY (user_id)    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pengajuan pendaftaran ke program, menunggu konfirmasi pengurus.
CREATE TABLE IF NOT EXISTS lms_pendaftaran (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  program_id VARCHAR(20) NOT NULL,
  status     ENUM('menunggu','diterima','ditolak') NOT NULL DEFAULT 'menunggu',
  alasan     VARCHAR(255) NULL,                          -- alasan penolakan / alasan mengikuti program
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_daftar_user (user_id),
  CONSTRAINT fk_daftar_u FOREIGN KEY (user_id)    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_daftar_p FOREIGN KEY (program_id) REFERENCES lms_program (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lms_undangan (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  program_id VARCHAR(20) NOT NULL,
  dari       VARCHAR(100) NULL,
  status     ENUM('menunggu','diterima','ditolak') NOT NULL DEFAULT 'menunggu',
  CONSTRAINT fk_und_u FOREIGN KEY (user_id)    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_und_p FOREIGN KEY (program_id) REFERENCES lms_program (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Kehadiran per sesi. Progres peserta = jumlah baris di sini / jumlah sesi program.
CREATE TABLE IF NOT EXISTS lms_kehadiran (
  sesi_id     VARCHAR(30) NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  dicatat_pada DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (sesi_id, user_id),
  CONSTRAINT fk_hadir_sesi FOREIGN KEY (sesi_id) REFERENCES lms_sesi (id) ON DELETE CASCADE,
  CONSTRAINT fk_hadir_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lms_tugas (
  id         VARCHAR(40) NOT NULL PRIMARY KEY,           -- contoh: dsa-t1
  program_id VARCHAR(20) NOT NULL,
  sesi_no    TINYINT UNSIGNED NOT NULL,
  judul      VARCHAR(150) NOT NULL,
  tenggat    DATE NOT NULL,
  deskripsi  TEXT NULL,
  CONSTRAINT fk_tugas_p FOREIGN KEY (program_id) REFERENCES lms_program (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lms_pengumpulan (
  tugas_id      VARCHAR(40) NOT NULL,
  user_id       INT UNSIGNED NOT NULL,
  nama_berkas   VARCHAR(190) NOT NULL,                   -- berkas disimpan di folder uploads/, bukan di database
  catatan       VARCHAR(255) NULL,
  dikumpul_pada DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tugas_id, user_id),
  CONSTRAINT fk_kumpul_t FOREIGN KEY (tugas_id) REFERENCES lms_tugas (id) ON DELETE CASCADE,
  CONSTRAINT fk_kumpul_u FOREIGN KEY (user_id)  REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Template sertifikat per program (diunggah admin). Gambar saat ini disimpan di kolom gambar.
CREATE TABLE IF NOT EXISTS lms_sertifikat_template (
  program_id  VARCHAR(20) NOT NULL PRIMARY KEY,
  gambar      LONGTEXT NULL,                             -- gambar template (data URL) disimpan langsung; nanti bisa diganti ke berkas
  gambar_path VARCHAR(255) NULL,
  lebar       INT UNSIGNED NOT NULL,
  tinggi      INT UNSIGNED NOT NULL,
  pos_x       FLOAT NOT NULL DEFAULT 50,                 -- persen dari lebar gambar
  pos_y       FLOAT NOT NULL DEFAULT 56,                 -- persen dari tinggi gambar
  ukuran      FLOAT NOT NULL DEFAULT 5,
  warna       CHAR(7) NOT NULL DEFAULT '#2B1C1A',
  ketebalan   SMALLINT UNSIGNED NOT NULL DEFAULT 600,
  kapital     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_templ_p FOREIGN KEY (program_id) REFERENCES lms_program (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;