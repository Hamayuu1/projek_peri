# Skenario uji integrasi web lembaga dan LMS

Jalankan di Laragon (Apache, MySQL, dan Flask hidup) setelah mengikuti `database/README.md`. Centang yang berhasil; catat yang gagal beserta pesan galatnya.
Siapkan dua akun pendaftar di situs lembaga (A dan B) dan satu program di LMS, lalu hubungkan dengan: `UPDATE lms_program SET nama_lembaga = 'Nama Program Di Situs Lembaga' WHERE id = 'ID_KELAS';` (nama harus sama persis).

## 1. Pemasangan
| # | Langkah | Hasil yang diharapkan | OK |
|---|---|---|---|
| 1.1 | Buka `http://localhost/web-lms/api/muat.php` tanpa login | 401, `"login": true` | [ ] |
| 1.2 | Buka `http://localhost/web-lms/.env` | Ditolak (403/404), isi tidak tampil | [ ] |
| 1.3 | Buka `http://localhost/web-lms/database/lms_schema.sql` | Ditolak (403) | [ ] |
| 1.4 | Hapus sementara `.env`, buka `api/muat.php` | Pesan "Berkas .env belum dibuat" | [ ] |

## 2. Admin LMS
| # | Langkah | Hasil | OK |
|---|---|---|---|
| 2.1 | Login admin dengan kata sandi benar | Masuk dasbor | [ ] |
| 2.2 | Login dengan `admin@gmail.com` / `admin123` | Ditolak | [ ] |
| 2.3 | Salah kata sandi 5 kali berturut-turut | Percobaan ke-6 ditolak dengan pesan tunggu 5 menit, bahkan dengan kata sandi benar | [ ] |
| 2.4 | Klik Keluar, lalu tekan tombol Back browser | Kembali ke halaman login, data tidak tampil | [ ] |
| 2.5 | Admin web lembaga (akun situs lembaga) dipakai login di LMS | Ditolak | [ ] |

## 3. Alur peserta
| # | Langkah | Hasil | OK |
|---|---|---|---|
| 3.1 | A daftar program di situs lembaga; belum diterima admin; A login di LMS | Ditolak atau tidak punya kelas (tidak ada program) | [ ] |
| 3.2 | Admin lembaga menerima A; A login di LMS dengan akun situs lembaga | Masuk dan otomatis berada di kelas program tersebut | [ ] |
| 3.3 | Admin lembaga membatalkan penerimaan A; A membuka ulang LMS | Kelas A menjadi nonaktif | [ ] |
| 3.4 | Matikan Flask, buka LMS sebagai admin dan peserta yang sudah login | Keanggotaan kelas tidak berubah (tidak ada yang dinonaktifkan) | [ ] |
| 3.5 | A dan B sama-sama diterima di program yang sama; A login | A hanya melihat dirinya sendiri di data (cek tab Network, respons `muat.php`: tidak ada email atau nama B) | [ ] |

## 4. Tugas dan berkas
| # | Langkah | Hasil | OK |
|---|---|---|---|
| 4.1 | Admin membuat sesi dan tugas | Tersimpan setelah refresh | [ ] |
| 4.2 | A mengumpulkan tugas (isian dan berkas) | Berhasil, muncul di admin | [ ] |
| 4.3 | A membatalkan pengumpulan | Hilang di admin; berkas fisik di `uploads/` ikut terhapus | [ ] |
| 4.4 | Login sebagai B, buka tautan unduh berkas A (ubah `pid` di URL) | Ditolak atau berkas milik B sendiri yang diberikan | [ ] |
| 4.5 | A mencoba membuka halaman admin | Tidak bisa melihat data admin; `simpan.php` mengembalikan 403 | [ ] |

## 5. Sesi
| # | Langkah | Hasil | OK |
|---|---|---|---|
| 5.1 | Setelah login, hapus cookie `lms_sesi` di DevTools lalu klik fitur apa pun | Muncul "Sesi berakhir", halaman kembali ke login | [ ] |
| 5.2 | Setelah Keluar, periksa Application > Local Storage | Kunci `peri_lms_v1` tidak ada (data peserta tidak tertinggal) | [ ] |

## 6. Catatan hasil
Tulis di sini: tanggal uji, versi commit (`git log -1`), dan hal yang gagal.
