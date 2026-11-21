-- Migrasi 03: satu pengumpulan tugas bisa berisi banyak isian (berkas, foto, link).
-- Jalankan di database peri_lms. Aman dijalankan ulang.

USE peri_lms;

CREATE TABLE IF NOT EXISTS lms_pengumpulan_item (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tugas_id  VARCHAR(40) NOT NULL,
  user_id   INT UNSIGNED NOT NULL,
  urutan    TINYINT UNSIGNED NOT NULL DEFAULT 1,
  tipe      ENUM('berkas','link') NOT NULL,
  nama      VARCHAR(190) NOT NULL,
  path      VARCHAR(80) NULL,
  url       VARCHAR(500) NULL,
  kb        INT UNSIGNED NULL,
  KEY idx_item_kumpul (tugas_id, user_id, urutan),
  CONSTRAINT fk_item_kumpul FOREIGN KEY (tugas_id, user_id) REFERENCES lms_pengumpulan (tugas_id, user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Salin isian lama (satu per pengumpulan) ke tabel baru.
INSERT INTO lms_pengumpulan_item (tugas_id, user_id, urutan, tipe, nama, path, url, kb)
SELECT g.tugas_id, g.user_id, 1, g.tipe, g.nama_berkas, g.path_berkas, g.url, g.kb
FROM lms_pengumpulan g
WHERE g.nama_berkas <> ''
  AND NOT EXISTS (SELECT 1 FROM lms_pengumpulan_item i WHERE i.tugas_id = g.tugas_id AND i.user_id = g.user_id);

-- Kolom lama boleh kosong; isiannya sekarang ada di lms_pengumpulan_item.
-- Kolom lama (nama_berkas, tipe, path_berkas, url, kb) dihapus nanti saat pembersihan.
ALTER TABLE lms_pengumpulan MODIFY nama_berkas VARCHAR(190) NULL;