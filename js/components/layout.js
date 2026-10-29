// Navbar & footer — meniru prototype kelompok. Tautan selain "Program" menuju halaman teman (isi href sesungguhnya).
const LINKS = [['Beranda', '#'], ['Program', '#/'], ['Tentang Kami', '#'], ['Dokumentasi', '#'], ['Umpan Balik', '#']];

export const navbar = () => `
<header class="nav">
  <div class="nav__inner container">
    <a class="brand" href="#/" aria-label="Perempuan Kreatif Indonesia"><span class="brand__mark">P</span><span class="brand__text">Perempuan<br>Kreatif<br>Indonesia</span></a>
    <button class="nav__toggle" aria-label="Buka menu" aria-expanded="false"><span></span><span></span><span></span></button>
    <nav class="nav__menu" id="menu">
      ${LINKS.map(([t, h]) => `<a href="${h}" class="${t === 'Program' ? 'is-active' : ''}">${t}</a>`).join('')}
      <a class="btn btn--outline btn--sm" href="#">Login</a>
    </nav>
  </div>
</header>`;

export const footer = () => `
<section class="cta-band"><div class="container">
  <p class="muted-light">Bergabunglah</p><h2>Bersama Kita Lebih Kuat</h2>
  <p>Wujudkan perubahan bersama komunitas perempuan kreatif yang saling mendukung dan memberdayakan.</p>
  <a class="btn btn--gold" href="#/pendaftaran">Daftar Sekarang</a></div></section>
<footer class="footer"><div class="container footer__cols"><span>Sosial Media</span><span>Sosial Media</span><span>Sosial Media</span></div></footer>`;

export function bindNavbar(root) {
  const btn = root.querySelector('.nav__toggle'), menu = root.querySelector('#menu');
  btn.addEventListener('click', () => { const o = menu.classList.toggle('is-open'); btn.setAttribute('aria-expanded', o); });
}
