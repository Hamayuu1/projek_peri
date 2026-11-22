-- Kolom yang dipakai integrasi dengan web lembaga (lembaga.php, simpan.php). Aman dijalankan berulang.
USE peri_lms;

-- 1. Tautan akun LMS ke akun web lembaga.
SET @ada = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'peri_user_id');
SET @q = IF(@ada = 0, 'ALTER TABLE users ADD COLUMN peri_user_id INT UNSIGNED NULL UNIQUE', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- 2. Peserta dari web lembaga tidak punya kata sandi LMS (login lewat Flask), jadi kolom ini boleh kosong.
ALTER TABLE users MODIFY password_hash VARCHAR(255) NULL;

-- 3. Nama program di web lembaga untuk setiap kelas LMS (harus sama persis, huruf besar/kecil diabaikan).
SET @ada = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lms_program' AND COLUMN_NAME = 'nama_lembaga');
SET @q = IF(@ada = 0, 'ALTER TABLE lms_program ADD COLUMN nama_lembaga VARCHAR(150) NULL', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- 4. Status keanggotaan 'nonaktif' (dipakai saat penerimaan dibatalkan di web lembaga).
ALTER TABLE lms_peserta_program MODIFY status ENUM('aktif','selesai','nonaktif') NOT NULL DEFAULT 'aktif';

-- Setelah membuat kelas di panel admin, hubungkan ke program web lembaga dengan perintah seperti:
--   UPDATE lms_program SET nama_lembaga = 'Digital Skill Academy' WHERE id = 'ID_KELAS';
-- (nilai nama_lembaga harus sama dengan nama program di situs lembaga)
