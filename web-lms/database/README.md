# Database LMS PERI (MySQL)

Database `peri_lms` berdiri sendiri. Isi data tidak ikut GitHub; yang ikut adalah berkas SQL untuk membuatnya.
Tidak ada lagi data contoh: akun admin dibuat dengan skrip, peserta masuk otomatis dari pendaftaran di situs PERI, program dikelola lewat panel admin.

## Isi folder
- `lms_schema.sql` membuat database `peri_lms` dan tabel-tabelnya.
- `migrasi_02_berkas.sql`, `migrasi_03_item.sql` menambah fitur berkas dan isian pengumpulan.
- `migrasi_04_admin.sql` membuat tabel `lms_admin` dan `lms_percobaan_login`.
- `buat_admin.php` membuat atau mengganti kata sandi admin LMS (dijalankan dari terminal).
- `buat_pengguna_db.sql` membuat pengguna MySQL khusus berhak akses minimum (untuk server sebenarnya).
- `bersihkan_data_contoh.sql` menghapus akun contoh bawaan versi lama, jika database Anda pernah diisi data contoh.

## Cara memasang (Laragon)
1. Nyalakan Laragon, klik **Start All** (Apache dan MySQL harus berjalan).
2. Salin folder `web-lms` ke folder web Laragon (`C:\laragon\www\`).
3. Buka HeidiSQL dari menu Laragon, lalu import berurutan: `lms_schema.sql`, `migrasi_02_berkas.sql`, `migrasi_03_item.sql`, `migrasi_04_admin.sql` (encoding **UTF-8**, tekan F9).
4. Salin `web-lms/.env.example` menjadi `web-lms/.env`, lalu isi.
5. Buat admin: `php database/buat_admin.php emailanda@contoh.com` (di folder `web-lms`).
6. Buka `http://localhost/web-lms/admin/` atau `http://localhost/web-lms/peserta/`.

## Server sebenarnya
- Jalankan `buat_pengguna_db.sql` (setelah mengganti kata sandinya), lalu isi `LMS_DB_USER` dan `LMS_DB_PASS` di `.env`. Jangan memakai `root`.
- Jika database pernah berisi data contoh, jalankan `bersihkan_data_contoh.sql` sekali.
- Taruh `.env` di luar folder web dan tunjuk lewat variabel lingkungan `PERI_LMS_ENV`, atau pastikan `.htaccess` aktif.

## Koneksi
Semua pengaturan koneksi ada di `.env` (tidak ikut GitHub). Lihat `.env.example`.
