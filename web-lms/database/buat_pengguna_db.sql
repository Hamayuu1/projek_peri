-- Pengguna MySQL khusus untuk LMS (hak akses minimum). Jalankan sekali sebagai root di server.
-- GANTI 'GANTI_DENGAN_KATA_SANDI_KUAT' sebelum dijalankan, lalu isi LMS_DB_USER dan LMS_DB_PASS di .env.
-- Jangan simpan kata sandi asli di berkas yang di-push ke GitHub.

CREATE USER IF NOT EXISTS 'lms_app'@'localhost' IDENTIFIED BY 'GANTI_DENGAN_KATA_SANDI_KUAT';

-- Database LMS: boleh baca dan tulis, tanpa hak mengubah struktur tabel.
GRANT SELECT, INSERT, UPDATE, DELETE ON peri_lms.* TO 'lms_app'@'localhost';

-- LMS tidak membaca database web lembaga; pendaftaran diambil lewat Flask (lihat LMS_KUNCI di .env).

FLUSH PRIVILEGES;
