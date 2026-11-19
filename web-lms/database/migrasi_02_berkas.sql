-- MIGRASI 02: dukungan berkas dan link untuk materi dan pengumpulan tugas.
-- Jalankan sekali di database peri_lms.

USE peri_lms;

ALTER TABLE lms_sesi
  ADD COLUMN materi_tipe ENUM('berkas','link') NULL AFTER materi_kb,
  ADD COLUMN materi_path VARCHAR(80) NULL AFTER materi_tipe,
  ADD COLUMN materi_url VARCHAR(500) NULL AFTER materi_path;

ALTER TABLE lms_pengumpulan
  ADD COLUMN tipe ENUM('berkas','link') NOT NULL DEFAULT 'berkas' AFTER nama_berkas,
  ADD COLUMN path_berkas VARCHAR(80) NULL AFTER tipe,
  ADD COLUMN url VARCHAR(500) NULL AFTER path_berkas,
  ADD COLUMN kb INT UNSIGNED NULL AFTER url;