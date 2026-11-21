-- Tahap 1a: akun admin LMS terpisah dari admin web lembaga, dan pencatat percobaan login.
-- Jalankan sekali pada database peri_lms (phpMyAdmin > Impor, atau: mysql -u root peri_lms < migrasi_04_admin.sql).
-- Akun admin dibuat lewat: php database/buat_admin.php email@contoh.com  (kata sandi tidak ditulis di berkas SQL).

CREATE TABLE IF NOT EXISTS lms_admin (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  dibuat_pada   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Satu baris per kunci (email atau alamat IP). Lima kegagalan berturut-turut = diblokir 5 menit.
CREATE TABLE IF NOT EXISTS lms_percobaan_login (
  kunci       CHAR(66) NOT NULL PRIMARY KEY,
  jumlah      INT UNSIGNED NOT NULL DEFAULT 0,
  mulai_pada  DATETIME NOT NULL,
  blok_sampai DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admin bawaan lama (role 'admin' di tabel users) tidak lagi dipakai untuk login. Hapus agar tidak tersisa kata sandi contoh:
DELETE FROM users WHERE role = 'admin';
