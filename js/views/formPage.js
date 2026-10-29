import { getFormOptions, analyzeProfile } from '../services/api.js';
import { validateProfile } from '../../recommendation/preprocessing.js';

const STEPS = [
  { name: 'Profil', fields: ['age', 'employment_status', 'economic_condition'] },
  { name: 'Preferensi', fields: ['interests'] },
  { name: 'Tujuan', fields: ['goals'] },
];
let step = 0, data, errors;

export function view() {
  step = 0; errors = {}; data = { age: '', employment_status: '', economic_condition: '', interests: [], goals: [] };
  return { title: 'Temukan Program', html: `<section class="container wizard"><h1 class="title title--sm">Temukan Program yang Tepat untuk Anda</h1><div id="wizard"></div></section>`,
    init: root => draw(root.querySelector('#wizard')) };
}

const err = k => (errors[k] ? `<p class="error" role="alert">${errors[k]}</p>` : '');
const radios = (name, group) => getFormOptions()[group].options.map(o =>
  `<label class="choice"><input type="radio" name="${name}" value="${o.id}" ${data[name] === o.id ? 'checked' : ''}><span>${o.label}</span></label>`).join('');
const checks = (name, group, cls) => getFormOptions()[group].options.map(o =>
  `<label class="${cls}"><input type="checkbox" name="${name}" value="${o.id}" ${data[name].includes(o.id) ? 'checked' : ''}><span>${o.label}</span></label>`).join('');

function body() {
  if (step === 0) return `
    <div class="field"><label for="age">Usia</label><input id="age" type="number" inputmode="numeric" min="10" max="90" value="${data.age}" placeholder="Contoh: 25">${err('age')}</div>
    <div class="field"><span class="label">Status pekerjaan</span><div class="choices">${radios('employment_status', 'employment')}</div>${err('employment_status')}</div>
    <div class="field"><span class="label">Kondisi ekonomi</span><div class="choices">${radios('economic_condition', 'economic')}</div>${err('economic_condition')}</div>`;
  if (step === 1) return `<div class="field"><span class="label">Topik apa yang ingin Anda pelajari? (boleh lebih dari satu)</span><div class="chips">${checks('interests', 'interests', 'chip')}</div>${err('interests')}</div>`;
  return `<div class="field"><span class="label">Apa tujuan Anda mengikuti program? (boleh lebih dari satu)</span><div class="cards-choice">${checks('goals', 'goals', 'choice-card')}</div>${err('goals')}</div>`;
}

function draw(el) {
  el.innerHTML = `
  <ol class="steps" aria-label="Langkah ${step + 1} dari 3">${STEPS.map((s, i) => `<li class="${i === step ? 'is-current' : i < step ? 'is-done' : ''}"><span>${i < step ? '✓' : i + 1}</span>${s.name}</li>`).join('')}</ol>
  <div class="card form-card"><p class="muted">Langkah ${step + 1} dari 3</p>${body()}
    <div class="form-actions">${step ? '<button class="btn btn--outline" data-act="back">Kembali</button>' : '<a class="btn btn--outline" href="#/">Batal</a>'}
    <button class="btn btn--primary" data-act="next">${step === 2 ? 'Analisis Profil Saya' : 'Lanjut'}</button></div></div>`;

  el.querySelectorAll('input[type=radio]').forEach(i => i.addEventListener('change', () => { data[i.name] = i.value; delete errors[i.name]; }));
  el.querySelectorAll('input[type=checkbox]').forEach(i => i.addEventListener('change', () => {
    const arr = data[i.name]; i.checked ? arr.push(i.value) : arr.splice(arr.indexOf(i.value), 1); delete errors[i.name]; }));
  el.querySelector('#age')?.addEventListener('input', e => { data.age = e.target.value; });
  el.querySelector('[data-act=back]')?.addEventListener('click', () => { step--; errors = {}; draw(el); });
  el.querySelector('[data-act=next]').addEventListener('click', () => {
    errors = validateProfile(data, STEPS[step].fields);            // validasi langkah ini
    if (Object.keys(errors).length) return draw(el);
    if (step < 2) { step++; return draw(el); }
    analyzeProfile({ ...data, age: Number(data.age) });             // hanya jalan jika profil lengkap
    location.hash = '#/hasil';
  });
}
