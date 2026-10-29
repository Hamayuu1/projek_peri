import { getLastResult, getProgram } from '../services/api.js';
import { photo } from '../components/media.js';

export const pct = s => Math.round(s * 100) + '%';
export const checkList = checks => `<ul class="checks">${checks.map(c => `<li class="${c.ok ? 'ok' : 'no'}">${c.ok ? '✓' : '–'} ${c.label}</li>`).join('')}</ul>`;

export function view() {
  const res = getLastResult();
  if (!res) return { html: `<section class="container section"><p class="empty">Anda belum mengisi profil.</p><a class="btn btn--primary" href="#/temukan">Isi profil sekarang</a></section>` };
  const list = res.recommendations.filter(r => r.score > 0);
  const [top, ...rest] = list, alts = rest.slice(0, 3);
  if (!top) return { html: `<section class="container section"><p class="empty">Belum ada program yang sesuai dengan profil Anda. Coba ubah minat atau tujuan.</p><a class="btn btn--primary" href="#/temukan">Ubah profil</a></section>` };
  const tp = getProgram(top.program_id);
  return { title: 'Hasil Rekomendasi', html: `
  <section class="container section result">
    <h1 class="title title--sm">Hasil Rekomendasi Program</h1>
    <p class="subtitle">Program yang paling sesuai dengan profil Anda</p>
    <article class="card main-reco">
      <span class="badge">Rekomendasi utama</span>
      <div class="main-reco__head"><h2>${tp.nama_program}</h2><div class="score"><strong>${pct(top.score)}</strong><span>Tingkat kesesuaian</span></div></div>
      <p>Program ini direkomendasikan karena memiliki karakteristik yang paling sesuai dengan profil dan tujuan Anda.</p>
      <h3>Mengapa program ini direkomendasikan?</h3>${checkList(top.checks)}<p class="reason">${top.reason}</p>
      <div class="form-actions"><a class="btn btn--primary" href="#/program/${tp.id}">Lihat Detail</a><a class="btn btn--gold" href="#/pendaftaran/${tp.id}">Daftar Sekarang</a></div>
    </article>
    ${alts.length ? `<h2 class="title title--sm">Program Lain yang Mungkin Sesuai</h2><div class="grid">${alts.map(r => { const p = getProgram(r.program_id);
      return `<article class="card program-card">${photo(p.gambar, 'program-card__img', 'Foto kegiatan ' + p.nama_program)}<span class="tag">${p.kategori}</span><h3>${p.nama_program}</h3><p>${p.deskripsi}</p>
      <p class="score-sm">${pct(r.score)} sesuai</p><p class="reason">${r.reason}</p><a class="btn btn--outline btn--sm" href="#/program/${p.id}">Lihat Detail</a></article>`; }).join('')}</div>` : ''}
    <p class="note"><a class="link" href="#/temukan">Ubah profil saya</a></p>
  </section>` };
}
