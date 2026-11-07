// Penjelasan rekomendasi. HANYA memakai fitur yang benar-benar dipakai vektor:
// fitur yang bernilai 1 di profil sekaligus 1 di kriteria program.
import { FEATURE_GROUPS, labelOf } from './features.js';

export function explain(profileValues, program) {
  const matched = [];
  for (const group of Object.keys(FEATURE_GROUPS)) {
    for (const id of profileValues[group] || []) {
      if ((program.kriteria[group] || []).includes(id)) matched.push({ group, id, label: labelOf(group, id) });
    }
  }
  const by = g => matched.filter(m => m.group === g).map(m => m.label);
  const has = g => by(g).length > 0;

  // Empat indikator centang pada halaman hasil
  const checks = [
    { key: 'interests', label: 'Minat sesuai', ok: has('interests') },
    { key: 'goals', label: 'Tujuan sesuai', ok: has('goals') },
    { key: 'status', label: 'Status peserta sesuai', ok: has('employment') },
    { key: 'characteristic', label: 'Karakteristik program sesuai', ok: has('age') || has('economic') },
  ];

  const parts = [];
  if (has('interests')) parts.push(`minat Anda pada ${by('interests').join(', ').toLowerCase()} sesuai dengan fokus program`);
  if (has('goals')) parts.push(`tujuan Anda untuk ${by('goals').join(', ').toLowerCase()} sejalan dengan program ini`);
  if (has('employment')) parts.push(`status Anda (${by('employment')[0].toLowerCase()}) termasuk sasaran program`);
  if (!parts.length && (has('age') || has('economic'))) parts.push('usia dan kondisi ekonomi Anda sesuai dengan sasaran program');
  const reason = parts.length ? 'Program ini cocok karena ' + parts.join('; ') + '.' : 'Kesesuaian dengan profil Anda terbatas.';

  return { matched_features: matched, checks, reason };
}
