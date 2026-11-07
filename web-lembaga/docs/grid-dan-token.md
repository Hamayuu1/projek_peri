# Grid dan Token (Desktop 1440)

## Grid

| Properti | Nilai |
|---|---|
| Lebar desain | 1440 px |
| Kolom | 12 |
| Lebar kolom | 78 px |
| Gutter | 24 px |
| Margin kiri/kanan | 120 px |
| Lebar kontainer | 1200 px (tetap pada layar lebih lebar) |

Kolom ke-n mulai di `120 + (n-1) × 102` px. Rentang n kolom selebar `n × 78 + (n-1) × 24`:

| Rentang | 3 | 4 | 5 | 6 | 7 | 8 | 12 |
|---|---|---|---|---|---|---|---|
| Lebar (px) | 282 | 384 | 486 | 588 | 690 | 792 | 1200 |

Pemakaian: `<div class="grid"><div class="col-7">…</div><div class="col-5">…</div></div>`. Penggeser awal dengan `.start-n`. `.grid--stretch` menyamakan tinggi kolom.

## Tipografi

| Token | Ukuran / tinggi baris | Huruf | Pemakaian |
|---|---|---|---|
| H1 | 48 / 56 | Tinos | judul hero saja |
| H2 | 32 / 40 | Poppins Bold | judul seksi |
| H3 | 24 / 32 | Poppins | judul kartu besar |
| H4 | 20 / 28 | Poppins | judul kartu |
| Lead | 18 / 28 | Roboto | paragraf pembuka |
| Isi | 16 / 26 | Roboto | teks utama |
| Kecil | 14 / 22 | Roboto | keterangan |
| Label | 12 / 18 | Poppins | eyebrow, lencana, peran (satu-satunya yang di bawah 14 px) |

## Jarak

Skala 8 / 16 / 24 / 32 / 40 / 48 / 64 / 96 px (`--space-*`). Padding seksi utama 96 px, seksi pendukung 64 px. Tinggi navbar 96 px.

## Warna

Seluruh warna ada di `tokens.css` (maroon utama, emas aksen, krem, permukaan, tint, teks). Jangan menulis kode hex langsung di CSS halaman; tambahkan token bila perlu warna baru.

## Hasil uji (1440, 1280, 1920)

Seluruh anak `.col-n` pada kelima halaman tepat di posisi dan lebar grid, tanpa overflow horizontal.