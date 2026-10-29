import { runEvaluation, getPrograms, getEvalData, saveEvalData, resetEvalData } from '../services/api.js';

const NAME = { cosine: 'Cosine Similarity', euclidean: 'Euclidean Distance' };
const f = x => x.toFixed(2);

export function view() { return { title: 'Evaluasi Model', html: '<section class="container section admin" id="admin"></section>', init: draw }; }

function draw(root) {
  const el = root.querySelector('#admin');
  const ev = runEvaluation(), ns = [1, 3, 5], ms = ['cosine', 'euclidean'], progName = id => getPrograms().find(p => p.id === id)?.nama_program ?? id;
  const bestTxt = ev.best ? `${NAME[ev.best]} (ditentukan oleh Precision@${ev.decidedBy})` : 'Seri — belum ada metode terbaik (sementara memakai Cosine Similarity)';
  el.innerHTML = `
  <h1 class="title title--sm">Recommendation Model Evaluation</h1>
  <p class="note">Halaman untuk admin/peneliti. TODO: lindungi dengan login dashboard admin kelompok.</p>
  ${ev.isDemo ? '<p class="warn">Data uji dan ground truth saat ini adalah DATA CONTOH, bukan penilaian pengurus PERI. Impor data asli di bagian bawah.</p>' : ''}
  <div class="grid grid--3">
    <div class="card stat"><span>Dataset</span><strong>${getPrograms().length} program</strong></div>
    <div class="card stat"><span>Jumlah profil uji</span><strong>${ev.numProfiles}</strong></div>
    <div class="card stat stat--best"><span>Best Method</span><strong>${ev.best ? NAME[ev.best] : 'Seri'}</strong></div>
  </div>
  <h2>Precision@N</h2><div class="table-wrap"><table><thead><tr><th>Method</th>${ns.map(n => `<th>Precision@${n}</th>`).join('')}</tr></thead><tbody>
  ${ms.map(m => `<tr class="${ev.best === m ? 'best' : ''}"><td>${NAME[m]}</td>${ns.map(n => `<td>${f(ev.results[m].precision[n])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <p class="note">Ambang relevan: rating admin ≥ ${ev.threshold}. Kesimpulan: <strong>${bestTxt}</strong>.</p>
  <h2>Perbandingan grafik</h2><div class="chart">${ns.map(n => `<div class="chart__group"><div class="chart__bars">
    ${ms.map(m => `<div class="bar bar--${m}" style="height:${Math.max(ev.results[m].precision[n] * 100, 2)}%" title="${NAME[m]}: ${f(ev.results[m].precision[n])}"><span>${f(ev.results[m].precision[n])}</span></div>`).join('')}
    </div><div class="chart__label">P@${n}</div></div>`).join('')}</div>
  <div class="legend"><span class="bar--cosine"></span>Cosine <span class="bar--euclidean"></span>Euclidean</div>
  <h2>Hasil per profil uji (Top-3)</h2><div class="table-wrap"><table><thead><tr><th>Profil</th><th>Relevan (ground truth)</th><th>Cosine Top-3</th><th>Euclidean Top-3</th></tr></thead><tbody>
  ${ev.results.cosine.details.map((d, i) => `<tr><td>#${d.profile_id}</td><td>${d.relevant.map(progName).join(', ') || '–'}</td>
    <td>${d.top.slice(0, 3).map(progName).join(', ')}</td><td>${ev.results.euclidean.details[i].top.slice(0, 3).map(progName).join(', ')}</td></tr>`).join('')}</tbody></table></div>
  <h2>Impor data uji</h2><p class="note">Format JSON: <code>{ "profiles": [{ "id", "age", "employment_status", "economic_condition", "interests": [], "goals": [] }], "ground_truth": [{ "profile_id", "program_id", "admin_rating" }] }</code></p>
  <div class="form-actions"><input type="file" id="file" accept=".json"><button class="btn btn--outline btn--sm" id="reset">Kembalikan data contoh</button></div><p class="error" id="msg"></p>`;
  el.querySelector('#file').addEventListener('change', async e => {
    try { const d = JSON.parse(await e.target.files[0].text()); if (!Array.isArray(d.profiles) || !Array.isArray(d.ground_truth)) throw 0; saveEvalData(d); draw(root); }
    catch { el.querySelector('#msg').textContent = 'File tidak valid. Pastikan formatnya sesuai contoh di atas.'; }
  });
  el.querySelector('#reset').addEventListener('click', () => { resetEvalData(); draw(root); });
}
