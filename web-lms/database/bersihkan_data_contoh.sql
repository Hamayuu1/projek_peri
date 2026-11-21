-- Menghapus akun dan data contoh bawaan lms_seed.sql lama (peserta contoh dan admin lama).
-- Jalankan SEKALI saat pemasangan di server sebenarnya, sebelum ada pengguna asli. Data turunan akun (kehadiran, pengumpulan, dst.) ikut terhapus.
-- Hanya akun yang belum terhubung ke web lembaga (peri_user_id kosong) dan berasal dari daftar contoh yang dihapus.
-- Program dan sesi tidak dihapus; ubah atau hapus lewat panel admin.
USE peri_lms;

DELETE FROM users
WHERE peri_user_id IS NULL
  AND LOWER(email) IN ('admin@gmail.com', 'peserta@gmail.com', 'sari@contoh.id', 'dewi@contoh.id', 'rina@contoh.id',
                       'maya@contoh.id', 'nur@contoh.id', 'fitri@contoh.id', 'lilis@contoh.id');
