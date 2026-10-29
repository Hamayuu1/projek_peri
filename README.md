# Modul Rekomendasi Program PERI (versi awal — JS native)

## Menjalankan
ES modules butuh server lokal (jangan buka lewat file://):
    npx serve .        # atau ekstensi "Live Server" di VS Code
    node tests/engine.test.js   # uji engine & evaluasi (Node 18+)

## Halaman (hash routing)
| URL | Halaman |
|---|---|
| `#/` | Program Kerja Kami + section rekomendasi |
| `#/temukan` | Form wizard 3 langkah |
| `#/hasil` | Hasil rekomendasi |
| `#/program/:id` | Detail program |
| `#/pendaftaran/:id` | Pendaftaran (stub; program terisi otomatis) |
| `#/admin/evaluasi` | Evaluasi Precision@N (admin) |

## Struktur
- `recommendation/` engine murni (tanpa DOM): features → preprocessing → vectorizer → similarity → engine → explain → evaluation
- `data/` program (PLACEHOLDER) & data uji (CONTOH)
- `js/services/api.js` satu-satunya pintu frontend ke engine; ganti ke `fetch('/api/...')` saat ada backend
- `database/schema.sql` skema tabel untuk integrasi backend

## Yang HARUS diganti sebelum penelitian
1. `data/programs.js` → data resmi program PERI (TODO ditandai).
2. `data/test_profiles.js` → profil uji + penilaian pengurus (impor lewat halaman admin).
3. Perilaku `NORMALIZE_GROUPS` di `recommendation/features.js` (lihat komentar: bila true, kedua metode selalu berperingkat sama).

## Menempelkan ke situs kelompok
Salin `recommendation/`, `data/`, `js/services/`, lalu ambil `programPage.js` (bagian `reco-banner`) dan `formPage/resultPage/detailPage` sesuai router kelompok.
Di form pendaftaran asli, baca `program_id` dari URL dan isi field program.
