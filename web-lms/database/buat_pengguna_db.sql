-- Pengguna MySQL khusus untuk LMS (hak akses minimum). Jalankan sekali sebagai root di server.
-- GANTI 'GANTI_DENGAN_KATA_SANDI_KUAT' sebelum dijalankan, lalu isi LMS_DB_USER dan LMS_DB_PASS di .env.
-- Jangan simpan kata sandi asli di berkas yang di-push ke GitHub.

CREATE USER IF NOT EXISTS 'lms_app'@'localhost' IDENTIFIED BY 'GANTI_DENGAN_KATA_SANDI_KUAT';

-- Database LMS: boleh baca dan tulis, tanpa hak mengubah struktur tabel.
GRANT SELECT, INSERT, UPDATE, DELETE ON peri_lms.* TO 'lms_app'@'localhost';

-- Database web lembaga: hanya membaca pendaftaran program dan email akun (tidak bisa membaca kata sandi atau tabel lain).
GRANT SELECT ON peri.pendaftaran_program TO 'lms_app'@'localhost';
GRANT SELECT (id, email, role) ON peri.users TO 'lms_app'@'localhost';

FLUSH PRIVILEGES;
