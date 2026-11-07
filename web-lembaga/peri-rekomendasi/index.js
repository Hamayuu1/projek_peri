// Pintu masuk tunggal modul rekomendasi untuk web lembaga (peri-lembaga).
// Alur sama dengan layanan `recommend` pada branch fitur-rekomendasi:
// metode (Cosine atau Euclidean) dipilih otomatis dari hasil evaluasi Precision@N
// terhadap data uji; bila seri, dipakai Cosine dan ditandai sementara.
import { PROGRAMS } from './data/programs.js';
import { TEST_PROFILES, GROUND_TRUTH } from './data/test_profiles.js';
import { generate_recommendations } from './recommendation/engine.js';
import { evaluateAll } from './recommendation/evaluation.js';
import { FEATURE_GROUPS } from './recommendation/features.js';
import { validateProfile } from './recommendation/preprocessing.js';

let aktif = null;

/** Metode terbaik hasil evaluasi (dihitung sekali, lalu disimpan). */
export function metodeAktif() {
  if (!aktif) {
    const { best } = evaluateAll({
      profiles: TEST_PROFILES,
      groundTruth: GROUND_TRUTH,
      programs: PROGRAMS,
      threshold: 2,
    });
    aktif = { method: best ?? 'cosine', sementara: !best };
  }
  return aktif;
}

/**
 * Ranking seluruh program untuk satu profil, urut dari yang paling sesuai.
 * profil: { age, employment_status, economic_condition, interests[], goals[] }
 * Melempar Error bila profil tidak valid.
 */
export function rekomendasikan(profil) {
  const { method } = metodeAktif();
  const hasil = generate_recommendations(profil, method).map((r) => ({
    program_id: r.program_id,
    program_name: r.program_name,
    score: r.similarity_score,
    rank: r.ranking,
    matched_features: r.matched_features,
    checks: r.checks,
    reason: r.recommendation_reason,
  }));
  return { method, hasil };
}

export { FEATURE_GROUPS, validateProfile };