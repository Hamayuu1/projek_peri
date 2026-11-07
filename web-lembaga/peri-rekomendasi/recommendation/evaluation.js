// Evaluasi Precision@N terhadap ground truth penilaian manual pengurus PERI.
import { generate_recommendations, METHODS } from './engine.js';

/** Precision@N = (jumlah program relevan pada N teratas) / N. */
export function evaluate_precision_at_n(recommendations, relevantIds, n) {
  const hits = recommendations.slice(0, n).filter(r => relevantIds.has(r.program_id)).length;
  return hits / n;
}
export const precision_at_n = evaluate_precision_at_n; // alias sesuai spesifikasi

/** Evaluasi satu metode pada seluruh profil uji. Program "relevan" jika admin_rating >= threshold. */
export function evaluateMethod({ method, profiles, groundTruth, programs, ns = [1, 3, 5], threshold = 2 }) {
  const details = profiles.map(p => {
    const relevant = new Set(groundTruth.filter(g => g.profile_id === p.id && g.admin_rating >= threshold).map(g => g.program_id));
    const ranked = generate_recommendations(p, method, programs);
    const precision = Object.fromEntries(ns.map(n => [n, evaluate_precision_at_n(ranked, relevant, n)]));
    return { profile_id: p.id, top: ranked.slice(0, Math.max(...ns)).map(r => r.program_id), relevant: [...relevant], precision };
  });
  const precision = Object.fromEntries(ns.map(n => [n, details.reduce((s, d) => s + d.precision[n], 0) / (details.length || 1)]));
  return { method, precision, details };
}

/** Pilih metode terbaik SECARA DINAMIS: bandingkan P@3 dulu, lalu P@1, lalu P@5. Seri penuh -> best = null. */
export function selectBestMethod(resultsByMethod, priority = [3, 1, 5]) {
  const eps = 1e-9;
  for (const n of priority) {
    const sorted = Object.values(resultsByMethod).sort((a, b) => b.precision[n] - a.precision[n]);
    if (sorted.length < 2 || sorted[0].precision[n] - sorted[1].precision[n] > eps) return { best: sorted[0].method, decidedBy: n };
  }
  return { best: null, decidedBy: null };
}

export function evaluateAll(opts) {
  const results = Object.fromEntries(METHODS.map(m => [m, evaluateMethod({ ...opts, method: m })]));
  return { results, ...selectBestMethod(results) };
}
