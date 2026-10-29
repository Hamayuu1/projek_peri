import { navbar, footer, bindNavbar } from './components/layout.js';
import { hydratePhotos } from './components/media.js';
import * as programPage from './views/programPage.js';
import * as formPage from './views/formPage.js';
import * as resultPage from './views/resultPage.js';
import * as detailPage from './views/detailPage.js';
import * as registerPage from './views/registerPage.js';
import * as adminPage from './views/adminPage.js';

// Hash routing sederhana: mudah ditempel ke situs kelompok.
const routes = [
  [/^#?\/?$/, programPage], [/^#\/temukan$/, formPage], [/^#\/hasil$/, resultPage],
  [/^#\/program\/(\d+)$/, detailPage], [/^#\/pendaftaran(?:\/(\d+))?$/, registerPage], [/^#\/admin\/evaluasi$/, adminPage],
];

function render() {
  const hash = location.hash || '#/';
  for (const [re, view] of routes) {
    const m = hash.match(re);
    if (!m) continue;
    const v = view.view(...m.slice(1));
    const app = document.getElementById('app');
    app.innerHTML = navbar() + `<main id="main">${v.html}</main>` + footer();
    bindNavbar(app); v.init?.(app.querySelector('#main')); hydratePhotos(app);
    window.scrollTo(0, 0); document.title = (v.title || 'Program') + ' — Perempuan Kreatif Indonesia';
    return;
  }
  location.hash = '#/';
}
window.addEventListener('hashchange', render);
render();
