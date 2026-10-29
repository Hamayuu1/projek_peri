// TAHAP 2–4 — Encoding, vektorisasi, normalisasi.
// Kategori tunggal (usia, pekerjaan, ekonomi) -> one-hot; kategori ganda (minat, tujuan) -> multi-hot.
// Normalisasi (opsional, lihat NORMALIZE_GROUPS): L2 per kelompok fitur. Default mati agar panjang vektor
// program berbeda-beda sehingga Cosine (hanya sudut) dan Euclidean (sudut + panjang) dapat dibandingkan.
import { FEATURE_GROUPS, GROUP_WEIGHTS, NORMALIZE_GROUPS } from './features.js';

/** values: { age:[id], employment:[id], economic:[id], interests:[id...], goals:[id...] } -> number[] */
export function vectorize(values, weights = GROUP_WEIGHTS) {
  const vector = [];
  for (const [group, def] of Object.entries(FEATURE_GROUPS)) {
    const chosen = values[group] || [];
    const raw = def.options.map(o => (chosen.includes(o.id) ? 1 : 0));          // encoding
    const norm = Math.sqrt(raw.reduce((s, x) => s + x * x, 0));                // panjang vektor kelompok
    vector.push(...raw.map(x => (NORMALIZE_GROUPS && norm ? x / norm : x) * weights[group])); // normalisasi (opsional) + bobot
  }
  return vector;
}

export const vectorizeProgram = program => vectorize(program.kriteria);
