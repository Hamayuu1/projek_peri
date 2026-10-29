// TAHAP 1 — Preprocessing: validasi, pembersihan, dan pengelompokan usia.
import { FEATURE_GROUPS } from './features.js';

export function ageToGroup(age) {
  if (age <= 20) return '<=20';
  if (age <= 35) return '21-35';
  if (age <= 50) return '36-50';
  return '>50';
}

const ids = g => FEATURE_GROUPS[g].options.map(o => o.id);

/** Validasi per field. Mengembalikan objek { namaField: pesanError }. */
export function validateProfile(p, fields = ['age', 'employment_status', 'economic_condition', 'interests', 'goals']) {
  const e = {};
  const age = Number(p.age);
  if (fields.includes('age') && (p.age === '' || !Number.isInteger(age) || age < 10 || age > 90)) e.age = 'Masukkan usia berupa angka antara 10 dan 90.';
  if (fields.includes('employment_status') && !ids('employment').includes(p.employment_status)) e.employment_status = 'Pilih status pekerjaan Anda.';
  if (fields.includes('economic_condition') && !ids('economic').includes(p.economic_condition)) e.economic_condition = 'Pilih kondisi ekonomi Anda.';
  if (fields.includes('interests') && !(p.interests || []).length) e.interests = 'Pilih minimal satu minat.';
  if (fields.includes('goals') && !(p.goals || []).length) e.goals = 'Pilih minimal satu tujuan.';
  return e;
}

/** Ubah profil mentah menjadi nilai kategorikal terstandar per kelompok fitur. */
export function preprocessProfile(p) {
  const errors = validateProfile(p);
  if (Object.keys(errors).length) throw new Error('Profil tidak lengkap: ' + Object.values(errors).join(' '));
  return {
    age: [ageToGroup(Number(p.age))],
    employment: [p.employment_status],
    economic: [p.economic_condition],
    interests: [...new Set(p.interests)].filter(i => ids('interests').includes(i)),
    goals: [...new Set(p.goals)].filter(i => ids('goals').includes(i)),
  };
}
