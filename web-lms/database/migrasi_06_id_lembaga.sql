-- Kelas LMS dihubungkan ke program situs lembaga lewat ID program (bukan nama). Aman dijalankan berulang.
USE peri_lms;

SET @ada = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lms_program' AND COLUMN_NAME = 'id_lembaga');
SET @q = IF(@ada = 0, 'ALTER TABLE lms_program ADD COLUMN id_lembaga INT UNSIGNED NULL UNIQUE', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- Kelas yang sebelumnya dihubungkan lewat nama (kolom nama_lembaga) otomatis diisi id_lembaga saat panel admin atau peserta dibuka
-- (Flask harus berjalan). Kolom nama_lembaga tidak dipakai lagi dan boleh diabaikan.
