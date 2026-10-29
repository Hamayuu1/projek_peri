import { getProgram, getPrograms } from '../services/api.js';

// STUB: halaman Pendaftaran milik teman. Yang penting dari modul ini: program dibawa lewat URL (#/pendaftaran/:id)
// dan terisi otomatis. Di form asli, cukup baca id dari URL lalu isi field program.
export function view(id) {
  const p = id ? getProgram(id) : null;
  return { title: 'Pendaftaran', html: `
  <section class="container section wizard"><h1 class="title title--sm">Pendaftaran Program</h1>
  <form class="card form-card" id="reg" novalidate>
    <div class="field"><label>Program yang dipilih</label>
      ${p ? `<input value="${p.nama_program}" readonly><input type="hidden" name="program_id" value="${p.id}">` :
        `<select name="program_id" required><option value="">Pilih program</option>${getPrograms().map(x => `<option value="${x.id}">${x.nama_program}</option>`).join('')}</select>`}</div>
    <div class="field"><label for="n">Nama lengkap</label><input id="n" name="nama" required></div>
    <div class="field"><label for="e">Email</label><input id="e" name="email" type="email" required></div>
    <div class="field"><label for="t">Nomor telepon</label><input id="t" name="telp" inputmode="tel" required></div>
    <p class="error" id="msg" role="alert"></p>
    <div class="form-actions"><button class="btn btn--primary" type="submit">Kirim Pendaftaran</button></div>
  </form><p class="note">Halaman ini hanya contoh serah-terima data; form pendaftaran asli dikerjakan anggota tim lain.</p></section>`,
  init(root) {
    root.querySelector('#reg').addEventListener('submit', e => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); const msg = root.querySelector('#msg');
      if (!f.program_id || !f.nama?.trim() || !/^\S+@\S+\.\S+$/.test(f.email || '') || !f.telp?.trim()) { msg.textContent = 'Lengkapi semua data dengan benar.'; return; }
      msg.className = 'success'; msg.textContent = 'Pendaftaran tersimpan (simulasi).';
    });
  } };
}
