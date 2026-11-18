# Database LMS PERI (MySQL)

Database `peri_lms` berdiri sendiri. Isi data tidak ikut GitHub; yang ikut adalah file SQL untuk membuatnya.

## Isi folder
- `lms_schema.sql` membuat database `peri_lms` dan 11 tabel (`users` dan 10 tabel `lms_*`).
- `lms_seed.sql` mengisi data contoh: 1 admin, 8 peserta, 6 program, sesi, kehadiran, tugas, pendaftaran.

## Cara memasang (Laragon)
1. Nyalakan Laragon, klik **Start All** (Apache dan MySQL harus berjalan).
2. Salin folder `web-lms` ke folder web Laragon (`C:\laragon\www\`).
3. Buka HeidiSQL dari menu Laragon (user `root`, password kosong).
4. Import `lms_schema.sql` lebih dulu, lalu `lms_seed.sql` (di HeidiSQL: File, Load SQL file, pilih encoding **UTF-8**, tekan F9).
   Kalau muncul peringatan "unsafe queries without a WHERE clause", pilih Yes.
5. Buka `http://localhost/web-lms/peserta/` atau `http://localhost/web-lms/admin/`.

## Akun contoh
Akun contoh untuk pengembangan dibuat oleh `lms_seed.sql`.





## Koneksi
Pengaturan koneksi ada di `web-lms/api/config.php` (bawaan Laragon: host 127.0.0.1, user root, password kosong).
Jangan menyimpan kata sandi database asli di file yang di-push ke GitHub.

## Catatan penting
- Jangan jalankan `lms_seed.sql` lagi setelah ada data asli. Menjalankannya ulang menimpa program dan menghapus data turunannya.







