# Struktur Folder `peri-lembaga`

```
peri-lembaga/
├── beranda.html  program.html  tentang.html  dokumentasi.html  hubungi.html
├── package.json  tsconfig.json  vite.config.ts  .env.example
└── src/
    ├── partials/            navbar.html, footer.html (disisipkan oleh plugin Vite)
    ├── assets/              logo, foto, gambar halaman auth
    ├── styles/
    │   ├── main.css         satu pintu: mengimpor semua CSS di bawah, urutan tetap
    │   ├── fonts.css        Poppins, Roboto, Tinos (@fontsource)
    │   ├── tokens.css       warna, skala huruf, jarak, bayangan
    │   ├── base.css         reset, elemen dasar, .visually-hidden, [hidden]
    │   ├── grid.css         .container, .grid, .col-n, .start-n
    │   ├── layout/          navbar.css, footer.css, section.css
    │   ├── components/      button, card, cta-band, page-hero, form,
    │   │                    auth-modal, temukan-program, daftar-program, animations
    │   └── pages/           beranda, program, tentang, dokumentasi, umpan-balik
    └── scripts/
        ├── main.ts          titik masuk; memuat komponen dan modul per halaman
        ├── components/      auth-modal, page-transition, reveal
        ├── pages/           program.ts (+ program/katalog, temukan-program,
        │                    daftar-program), umpan-balik.ts
        ├── services/        api.ts (komunikasi ke peri-backend)
        ├── types/           index.ts, global.d.ts
        └── utils/           html.ts
```

## Aturan penempatan

| Jenis berkas | Letak |
|---|---|
| Gaya yang dipakai di banyak halaman | `styles/components/` |
| Gaya khusus satu halaman | `styles/pages/<halaman>.css` dengan awalan kelas halaman |
| Gaya kerangka (navbar, footer, seksi) | `styles/layout/` |
| Nilai warna, ukuran, jarak baru | `tokens.css` dulu, baru dipakai |
| Skrip yang dipakai banyak halaman | `scripts/components/` |
| Skrip khusus halaman | `scripts/pages/`, dimuat lewat `body[data-page]` |
| Pemanggilan API | `scripts/services/api.ts` saja |
| Bagian HTML yang sama di semua halaman | `src/partials/` |

Setiap CSS baru wajib didaftarkan di `main.css`.

## Awalan kelas per halaman

`br-` beranda, `pg-` program, `ab-` tentang, `dk-` dokumentasi, `ub-` dan `testi-` umpan balik, `tp-` temukan program, `dp-` daftar program.

## Variabel lingkungan

`VITE_ADMIN_URL` (lihat `.env.example`): alamat panel admin untuk tautan masuk admin.

## Belum dikerjakan

`peri-admin`, `peri-backend`, dan `peri-nlp` masih memakai struktur lama dan akan dirapikan pada tahap tersendiri.