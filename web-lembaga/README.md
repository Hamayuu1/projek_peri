# peri-lembaga

Situs publik **Perempuan Kreatif Indonesia (PERI)**, Samarinda. Dibangun dengan Vite (multi-page) dan TypeScript, tanpa framework. Tampilan saat ini untuk **desktop (grid 1440)**; tablet dan mobile menyusul.

## Menjalankan

Prasyarat: Node.js 20.19 atau lebih baru.

```bash
npm install
cp .env.example .env     # sesuaikan alamat panel admin
npm run dev              # server pengembangan
npm run typecheck        # cek tipe TypeScript
npm run build            # tsc + vite build ke dist/
npm run preview          # coba hasil build
```

Fitur login dan pendaftaran program, serta formulir umpan balik, memerlukan `peri-backend` (Flask, port 5001) yang sedang berjalan.

## Halaman

| Berkas | Halaman | `data-page` |
|---|---|---|
| `beranda.html` | Beranda | beranda |
| `program.html` | Program (katalog, temukan program, daftar) | program |
| `tentang.html` | Tentang Kami | tentang |
| `dokumentasi.html` | Dokumentasi | dokumentasi |
| `hubungi.html` | Umpan Balik / Hubungi | hubungi |

Navbar dan footer ditulis sekali di `src/partials/` dan disisipkan ke setiap halaman lewat komentar `<!-- @include navbar page="x" -->` dan `<!-- @include footer -->` (plugin di `vite.config.ts`). Menu aktif diberi `aria-current="page"` otomatis.

## Dokumen lain

- [docs/struktur-folder.md](docs/struktur-folder.md): peta folder dan aturan penempatan berkas.
- [docs/grid-dan-token.md](docs/grid-dan-token.md): grid 12 kolom, token warna, tipografi, dan jarak.

## Aturan singkat

- Tidak ada `style=""` maupun `<script>` inline di HTML; semua gaya di `src/styles`, semua skrip di `src/scripts`.
- Ukuran, warna, dan jarak diambil dari token di `tokens.css`, bukan angka lepas.
- Tata letak memakai kelas grid (`.grid`, `.col-n`, `.start-n`), bukan lebar manual.
- Data contoh (testimoni, WhatsApp, email) ditandai "Contoh" dan perlu diganti data asli.