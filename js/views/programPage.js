import { getPrograms } from '../services/api.js';
import { photo, hydratePhotos, BANNER_IMG } from '../components/media.js';

export const programCard = (p, extra = '') => `
<article class="card program-card">
  ${photo(p.gambar, 'program-card__img', 'Foto kegiatan ' + p.nama_program)}
  <span class="tag">${p.kategori}</span>
  <h3>${p.nama_program}</h3>
  <p>${p.deskripsi}</p>${extra}
  <a class="link" href="#/program/${p.id}">Pelajari lebih lanjut</a>
</article>`;

export function view() {
  const cats = [...new Set(getPrograms().map(p => p.kategori))];
  return { title: 'Program Kerja Kami', html: `
  <section class="hero"><div class="container">
    <h1>Mewujudkan Karya Nyata Melalui Pilar Program Unggulan</h1>
    <a class="btn btn--primary" href="#program-list">Temukan Peluang Anda</a></div></section>

  <!-- ===== MODUL REKOMENDASI (disisipkan, tidak mengubah bagian lain) ===== -->
  <section class="container reco-banner"><div class="reco-banner__box">
    <div><h2>Belum tahu program yang cocok untuk Anda?</h2>
    <p>Isi beberapa informasi tentang diri Anda dan kami akan membantu menemukan program PERI yang paling sesuai dengan kebutuhan Anda.</p>
    <a class="btn btn--primary" href="#/temukan">Temukan Program yang Cocok</a></div>
    ${photo(BANNER_IMG, 'reco-banner__art', 'Foto kegiatan PERI', 'Foto kegiatan PERI')}
  </div></section>

  <section class="container filters" id="program-list">
    <label>Pencarian<input type="search" id="q" placeholder="Telusuri…"></label>
    <label>Kategori<select id="cat"><option value="">Semua kategori</option>${cats.map(c => `<option>${c}</option>`).join('')}</select></label>
  </section>
  <section class="container section"><h2 class="title">Program Kerja Kami</h2>
    <p class="count" id="count"></p><div class="grid" id="grid"></div></section>`,
  init(root) {
    const q = root.querySelector('#q'), cat = root.querySelector('#cat'), grid = root.querySelector('#grid'), count = root.querySelector('#count');
    const draw = () => {
      const t = q.value.trim().toLowerCase();
      const list = getPrograms().filter(p => (!cat.value || p.kategori === cat.value) && (!t || (p.nama_program + p.deskripsi).toLowerCase().includes(t)));
      count.textContent = `Menampilkan ${list.length} program`;
      grid.innerHTML = list.length ? list.map(p => programCard(p)).join('') : '<p class="empty">Tidak ada program yang cocok dengan pencarian. Coba kata kunci lain atau pilih semua kategori.</p>';
      hydratePhotos(grid);
    };
    q.addEventListener('input', draw); cat.addEventListener('change', draw); draw();
  } };
}
