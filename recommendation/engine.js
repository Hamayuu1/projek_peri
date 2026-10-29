// Recommendation engine Content-Based Filtering.
// Alur: profil -> preprocessing -> vektor -> bandingkan dengan vektor tiap program -> ranking Top-N.
import { PROGRAMS } from '../data/programs.js';
import { preprocessProfile } from './preprocessing.js';
import { vectorize, vectorizeProgram } from './vectorizer.js';
import { calculate_cosine_similarity, calculate_euclidean_distance, euclideanToSimilarity } from './similarity.js';
import { explain } from './explain.js';

export const METHODS = ['cosine', 'euclidean'];

/** Skor kesesuaian 0–1 untuk satu pasangan (profil, program) menurut metode terpilih. */
function scoreOf(method, profileVec, programVec) {
  if (method === 'cosine') return calculate_cosine_similarity(profileVec, programVec);
  if (method === 'euclidean') return euclideanToSimilarity(calculate_euclidean_distance(profileVec, programVec));
  throw new Error('Metode tidak dikenal: ' + method);
}

/** Menghasilkan ranking SEMUA program untuk satu metode. Kedua metode memakai programs & vektor yang sama. */
export function generate_recommendations(profile, method, programs = PROGRAMS) {
  const values = preprocessProfile(profile);
  const profileVec = vectorize(values);
  return programs
    .map(p => {
      const exp = explain(values, p);
      return {
        program_id: p.id, program_name: p.nama_program, method,
        similarity_score: Number(scoreOf(method, profileVec, vectorizeProgram(p)).toFixed(4)),
        matched_features: exp.matched_features, checks: exp.checks, recommendation_reason: exp.reason,
      };
    })
    .sort((a, b) => b.similarity_score - a.similarity_score || a.program_id - b.program_id) // tie-break: id kecil
    .map((r, i) => ({ ...r, ranking: i + 1 }));
}

/** Titik masuk utama: recommendPrograms(profile, method, topN). */
export function recommendPrograms(profile, method = 'cosine', topN = 5, programs = PROGRAMS) {
  return generate_recommendations(profile, method, programs).slice(0, topN);
}
