# PERI — Evaluasi Program

PERI adalah aplikasi evaluasi program pemberdayaan perempuan. Aplikasi ini
menerima ulasan dan rating peserta, menyajikan ringkasan evaluasi, serta
membandingkan prediksi sentimen dari Naive Bayes, SVM, dan Ensemble.

## Tujuan

- Mengumpulkan masukan peserta melalui ulasan dan rating enam aspek layanan.
- Membantu pengelola membaca distribusi sentimen dan perubahan pengalaman
  peserta dari waktu ke waktu.
- Menjelaskan tahapan preprocessing dan hasil model secara transparan.
- Menyediakan alur untuk mengimpor data berlabel dan memperbarui model.

Hasil analisis adalah alat bantu evaluasi, bukan pengganti konteks dan penilaian
manusia. Data contoh ditandai sebagai demo dan dapat dihapus melalui area admin.

## Struktur proyek

```text
backend/
  config.py           Konfigurasi path, aspek, dan environment variable
  database.py         Model SQLAlchemy dan inisialisasi SQLite
  main.py             API FastAPI dan penyajian frontend
data/
  column_mapping.json Pemetaan nama kolom CSV ke field aplikasi
  demo_profiles.json  Profil program untuk data contoh
  programs.json       Daftar program awal
  slang.json          Kamus normalisasi bahasa tidak baku
dataset/
  data_ulasan.csv     Dataset lokal yang dipakai untuk pelatihan
frontend/
  index.html          Dashboard evaluasi
  admin.html          Halaman pengelolaan admin
  *.js, styles.css    Perilaku dan gaya frontend tanpa build tool
ml/
  preprocessing.py    Tahapan pemrosesan teks bahasa Indonesia
  train.py            Pelatihan, validasi, dan pembuatan artifact model
  explain.py          Prediksi, probabilitas, dan kata penentu
  artifacts/          Artifact hasil pelatihan; dibuat saat training
scripts/
  import_csv.py       Validasi dan impor file CSV
  seed_demo.py        Pengisian ulasan contoh yang dapat dihapus
tests/
  conftest.py         Fixture model uji dan database SQLite sementara
  test_*.py           Tes preprocessing, model, dan endpoint
requirements.txt      Dependensi aplikasi dan pytest
```

## Instalasi

Gunakan Python yang sesuai dengan dependensi proyek. Contoh berikut memakai
PowerShell di Windows:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Jika PowerShell memblokir aktivasi virtual environment, jalankan perintah
Python melalui `.\.venv\Scripts\python.exe`.

## Menjalankan aplikasi

Jalankan perintah berikut dari direktori utama proyek dan dalam urutan ini:

```powershell
# 1. Instal dependensi (lihat bagian Instalasi)
python -m pip install -r requirements.txt

# 2. Latih model, evaluasi dengan Stratified K-Fold, dan buat artifact
python -m ml.train

# 3. Isi database dengan ulasan demonstrasi yang dapat dihapus
python -m scripts.seed_demo

# 4. Atur token admin, lalu jalankan API dan frontend
$env:PERI_ADMIN_TOKEN = "ganti-dengan-token-admin-yang-kuat"
uvicorn backend.main:app --reload
```

Buka `http://127.0.0.1:8000/` untuk dashboard dan
`http://127.0.0.1:8000/admin.html` untuk area admin. Jangan membagikan token
admin atau menyimpannya ke source control. Endpoint admin tidak aktif jika
`PERI_ADMIN_TOKEN` belum diatur.

Mode demo aktif secara default. Untuk mematikannya, atur environment variable
sebelum menjalankan server:

```powershell
$env:PERI_DEMO_MODE = "false"
uvicorn backend.main:app --reload
```

Nilai `PERI_DEMO_MODE` yang diterima adalah `true` atau `false` (juga `1/0`,
`yes/no`, dan `on/off`). Perubahan berlaku setelah server dimulai ulang.

## Metode analisis

1. **Preprocessing:** case folding, pembersihan karakter, normalisasi slang,
   penghapusan stopword, dan stemming dengan Sastrawi. Kata negasi penting
   seperti “tidak”, “bukan”, “kurang”, “jangan”, dan “belum” dipertahankan.
2. **TF-IDF:** mengubah teks menjadi bobot fitur kata dan pasangan kata.
3. **Naive Bayes dan SVM:** dua model membuat prediksi sentimen dan probabilitas.
4. **Ensemble:** soft voting merata-ratakan probabilitas kedua model, lalu
   memilih kelas dengan probabilitas gabungan tertinggi.
5. **Evaluasi:** Stratified K-Fold mempertahankan proporsi kelas pada tiap fold.
   Akurasi mean dan standar deviasi, precision, recall, F1, macro F1, serta
   confusion matrix tersedia pada tab **Metode & Evaluasi**.

Dataset harus memiliki setidaknya dua contoh pada setiap kelas agar validasi
Stratified K-Fold dapat dijalankan. Untuk menghasilkan artifact, gunakan:

```powershell
python -m ml.train
```

Perintah ini menggunakan `dataset/data_ulasan.csv` secara default dan membuat
model, metrik, serta kata teratas di `ml/artifacts/`.

## Mengganti data demo dengan data asli

Lakukan langkah berikut saat beralih ke dataset produksi:

1. **Siapkan CSV berlabel.** Setiap baris setidaknya harus memiliki komentar,
   nama program, dan label (`positif`, `netral`, atau `negatif`). Rating enam
   aspek bersifat opsional; jika satu rating disertakan, semua rating aspek
   harus diisi dengan bilangan bulat 1–5.
2. **Atur `data/column_mapping.json` sebelum mengimpor.** Setiap pasangan
   menggunakan format `"nama kolom di CSV": "field aplikasi"`. Field yang
   didukung meliputi `komentar`, `label`, `program`, `nama_peserta`, `tanggal`,
   `aspek_terkait`, dan enam aspek rating: `fasilitas`, `pengajar`, `materi`,
   `pelaksanaan`, `pelayanan`, `manfaat`. Contoh untuk CSV dengan judul kolom
   berbeda:

   ```json
   {
     "Isi Ulasan": "komentar",
     "Kategori Sentimen": "label",
     "Nama Program": "program",
     "Nama Peserta": "nama_peserta",
     "tanggal": "tanggal",
     "rating_fasilitas": "fasilitas",
     "rating_pengajar": "pengajar",
     "rating_materi": "materi",
     "rating_pelaksanaan": "pelaksanaan",
     "rating_pelayanan": "pelayanan",
     "rating_manfaat": "manfaat",
     "aspek_terkait": "aspek_terkait"
   }
   ```

   Nama di sebelah kiri harus cocok dengan header CSV; nilai di sebelah kanan
   harus merupakan field aplikasi yang didukung.
3. **Impor CSV** melalui **Area admin** (`/admin.html`). Masukkan
   `PERI_ADMIN_TOKEN`, pilih atau seret file CSV, lalu tinjau jumlah baris yang
   diterima dan alasan penolakan. Perbaiki baris atau mapping bila perlu dan
   impor ulang.
4. **Hapus data demo sebelum melatih ulang.** Di area admin, pilih **Hapus Data
   Demo** dan konfirmasi. Langkah ini penting karena endpoint latih ulang
   menggunakan ulasan berlabel yang masih tersimpan sebagai data latih;
   menghapus demo setelah training tidak menghapus contoh demo dari model yang
   sudah terlatih.
5. **Latih ulang model** dari area admin setelah data demo dihapus. Training
   menggunakan seluruh ulasan berlabel tersimpan, sehingga CSV asli perlu
   memiliki label yang valid dan cukup contoh per kelas. Tinjau metrik terbaru
   sebelum digunakan. Jika belum ada ulasan berlabel di database, training
   menggunakan dataset lokal default; pastikan dataset itu juga sudah
   diganti atau diperbarui agar tidak melatih data lama.
6. **Matikan mode demo** setelah server dihentikan atau sebelum memulainya:

   ```powershell
   $env:PERI_DEMO_MODE = "false"
   uvicorn backend.main:app --reload
   ```

   Setelah server dimulai ulang, pastikan badge **Data Contoh (Demo)** tidak
   lagi muncul. Pengaturan ini mengubah penandaan ulasan baru; tidak menghapus
   ulasan demo yang sudah tersimpan. Periksa kembali bahwa data contoh telah
   dihapus sebelum mengumpulkan ulasan produksi.

## Menjalankan tes

Tes menggunakan model kecil yang dilatih di memori dan SQLite sementara di
direktori pytest. Tes tidak memerlukan file model produksi dan tidak menulis ke
`backend/peri.db`:

```powershell
python -m pytest -q
```
