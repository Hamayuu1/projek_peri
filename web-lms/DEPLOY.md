# Panduan penerapan LMS PERI (subdomain `lms.`)

Susunan yang dituju: situs lembaga di `https://domain-anda`, LMS di `https://lms.domain-anda`.
Tidak ada permintaan lintas situs dari browser (login peserta diteruskan oleh server LMS ke Flask), sehingga **CORS tidak perlu diatur**. Cookie sesi LMS berlaku hanya untuk `lms.` (tanpa pengaturan domain), jadi tidak ikut terkirim ke situs lembaga.

## 1. Server web (Apache)
- Buat virtual host `lms.domain-anda` dengan DocumentRoot = folder `web-lms`, lalu pasang sertifikat HTTPS (mis. Let's Encrypt).
- Aktifkan `mod_headers`, `mod_rewrite`, dan izinkan `AllowOverride All` agar `.htaccess` berlaku.
- Setelah HTTPS jalan, aktifkan baris `Strict-Transport-Security` di `.htaccess`.

## 2. Pengaturan PHP (php.ini)
- `display_errors = Off`, `log_errors = On`
- `upload_max_filesize` dan `post_max_size` sesuai batas berkas yang diizinkan
- `session.cookie_httponly = 1`

## 3. Kredensial (`.env`)
- Salin `.env.example` menjadi `.env`, **simpan di luar DocumentRoot**, lalu tunjuk dengan variabel lingkungan `PERI_LMS_ENV` (Apache: `SetEnv PERI_LMS_ENV /etc/peri/lms.env`).
- Isi `LMS_DB_USER` dengan pengguna dari `database/buat_pengguna_db.sql` (bukan root), `LMS_HTTPS=1`, `LMS_FLASK_URL=http://127.0.0.1:5001`, dan `LMS_KUNCI`.
- `LMS_KUNCI` harus sama dengan `PERI_LMS_KUNCI` di `peri-backend/.env`.

## 4. Flask (web lembaga)
- Jalankan hanya di `127.0.0.1:5001` (tidak dibuka ke internet); publik lewat reverse proxy atau server produksi (mis. gunicorn).
- `PERI_HTTPS=1` di `peri-backend/.env`. Jalur `/api/lms/pendaftaran` hanya dipakai server LMS, sebaiknya tidak diteruskan oleh reverse proxy ke publik.

## 5. Database
- Impor `lms_schema.sql`, `migrasi_02`, `migrasi_03`, `migrasi_04`, `migrasi_05`, lalu `buat_pengguna_db.sql`.
- Jika pernah berisi data contoh, jalankan `bersihkan_data_contoh.sql` sekali.
- Buat admin: `php database/buat_admin.php email@anda.com`.

## 6. Folder unggahan
- `uploads/` harus bisa ditulis oleh pengguna web server, dan folder ini tidak boleh dibuka langsung lewat alamat web (sudah ditolak oleh `uploads/.htaccess`; berkas disajikan lewat `unduh.php` setelah login).

## 7. Daftar periksa sebelum dibuka ke publik
- [ ] HTTPS aktif di `lms.` dan `LMS_HTTPS=1`
- [ ] `.env` di luar DocumentRoot, tidak bisa dibuka lewat alamat web (uji: `https://lms.domain-anda/.env` harus ditolak)
- [ ] `database/` tidak bisa dibuka (uji: `/database/lms_schema.sql` harus ditolak)
- [ ] Pengguna MySQL khusus dipakai, bukan root
- [ ] Admin dibuat dan login berhasil; akun contoh sudah dihapus
- [ ] `display_errors` mati
- [ ] Flask tidak terbuka ke internet langsung
