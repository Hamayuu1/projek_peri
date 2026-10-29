import { getProgram, getLastResult } from '../services/api.js';
import { photo } from '../components/media.js';
import { pct, checkList } from './resultPage.js';

export function view(id) {
  const p = getProgram(id);
  if (!p) return { html: '<section class="container section"><p class="empty">Program tidak ditemukan.</p><a class="btn btn--primary" href="#/">Kembali ke program</a></section>' };
  const rec = getLastResult()?.recommendations.find(r => r.program_id === p.id);   // ada hanya jika user sudah isi profil
  const fit = rec && rec.score > 0 ? `
    <aside class="card fit"><span class="badge">Program ini sesuai dengan profil Anda</span>
    <p class="score-sm">${pct(rec.score)} tingkat kesesuaian <span class="muted">(berdasarkan profil yang Anda isi tadi)</span></p><h3>Mengapa program ini direkomendasikan?</h3>${checkList(rec.checks)}<p class="reason">${rec.reason}</p></aside>` : '';
  const row = (k, v) => `<div class="detail__row"><dt>${k}</dt><dd>${v}</dd></div>`;
  return { title: p.nama_program, html: `
  <section class="container section detail">
    <a class="link" href="#/">← Kembali ke program</a>
    <h1 class="title title--sm">${p.nama_program}</h1><span class="tag">${p.kategori}</span>
    ${photo(p.gambar, 'detail__img', 'Foto kegiatan ' + p.nama_program)}
    ${fit}
    <dl class="card detail__list">${row('Deskripsi', p.deskripsi)}${row('Target peserta', p.target_sasaran)}${row('Tujuan', p.tujuan)}${row('Output', p.output)}${row('Periode pelaksanaan', p.periode)}</dl>
    ${p.placeholder ? '<p class="note">Data program ini masih contoh (placeholder) dan belum data resmi PERI.</p>' : ''}
    <a class="btn btn--primary" href="#/pendaftaran/${p.id}">Daftar Program</a>
  </section>` };
}
