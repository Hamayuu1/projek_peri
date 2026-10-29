// Helper gambar. Foto dipasang HANYA jika file-nya berhasil dimuat; kalau belum ada,
// kotak placeholder abu-abu tetap tampil (tidak ada ikon gambar rusak).
export const BANNER_IMG = 'assets/img/banner-kegiatan.jpg';

/** Kotak foto berlatar placeholder. `src` relatif terhadap index.html. */
export const photo = (src, cls, label, text = '') =>
  `<div class="${cls}" role="img" aria-label="${label}" data-photo="${src || ''}">${text}</div>`;

/** Panggil setelah HTML dirender: memuat semua [data-photo] di dalam `root`. */
export function hydratePhotos(root) {
  root.querySelectorAll('[data-photo]').forEach(el => {
    const src = el.dataset.photo;
    if (!src) return;
    const img = new Image();
    img.onload = () => { el.style.backgroundImage = `url("${src}")`; el.classList.add('has-photo'); };
    img.src = src;
  });
}
