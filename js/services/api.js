// Lapisan service. Frontend HANYA memanggil file ini.
// Saat backend siap, ganti isi tiap fungsi dengan fetch('/api/...') — view tidak perlu diubah.
import { PROGRAMS } from '../../data/programs.js';
import { TEST_PROFILES, GROUND_TRUTH } from '../../data/test_profiles.js';
import { FEATURE_GROUPS } from '../../recommendation/features.js';
import { generate_recommendations, METHODS } from '../../recommendation/engine.js';
import { evaluateAll } from '../../recommendation/evaluation.js';

const KEY = { result: 'peri_last_result', eval: 'peri_eval_data', db: 'peri_db_log' };
const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
// Hasil analisis peserta hanya berlaku selama tab terbuka (sessionStorage), agar tidak muncul sebagai
// "profil Anda" pada kunjungan berikutnya sebelum peserta mengisi form.
const readSession = k => { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } };
const writeSession = (k, v) => sessionStorage.setItem(k, JSON.stringify(v));
try { localStorage.removeItem(KEY.result); } catch {} // buang sisa hasil lama dari versi sebelumnya

// GET /api/programs
export const getPrograms = () => PROGRAMS;
// GET /api/programs/:id
export const getProgram = id => PROGRAMS.find(p => p.id === Number(id));
// GET /api/form-options
export const getFormOptions = () => FEATURE_GROUPS;

// Data uji (bisa diganti lewat impor admin)
export const getEvalData = () => read(KEY.eval, { profiles: TEST_PROFILES, ground_truth: GROUND_TRUTH, isDemo: true });
export const saveEvalData = d => write(KEY.eval, { ...d, isDemo: false });
export const resetEvalData = () => localStorage.removeItem(KEY.eval);

// GET /api/evaluation — Precision@N kedua metode + metode terbaik (tidak di-hard-code)
export function runEvaluation(threshold = 2) {
  const d = getEvalData();
  const ev = evaluateAll({ profiles: d.profiles, groundTruth: d.ground_truth, programs: PROGRAMS, threshold });
  return { ...ev, isDemo: d.isDemo, numProfiles: d.profiles.length, numGroundTruth: d.ground_truth.length, threshold };
}

/** Metode aktif = pemenang evaluasi. Bila seri/belum ada, default Cosine (ditandai sementara). */
export function getActiveMethod() {
  const { best } = runEvaluation();
  return { method: best ?? 'cosine', provisional: !best };
}

// POST /api/recommendations (+ /recommend/cosine, /recommend/euclidean lewat parameter `method`)
export function recommend(profile, method) {
  const m = method ?? getActiveMethod().method;
  const ranked = generate_recommendations(profile, m);
  return { method: m, recommendations: ranked.map(r => ({
    program_id: r.program_id, program_name: r.program_name, score: r.similarity_score, rank: r.ranking,
    matched_features: r.matched_features, checks: r.checks, reason: r.recommendation_reason })) };
}

/** Jalankan kedua metode pada profil yang sama, simpan (simulasi tabel recommendations), kembalikan hasil metode aktif. */
export function analyzeProfile(profile) {
  const active = getActiveMethod();
  const all = Object.fromEntries(METHODS.map(m => [m, recommend(profile, m)]));
  const result = { profile, ...active, ...all[active.method], all, created_at: new Date().toISOString() };
  writeSession(KEY.result, result);
  const log = read(KEY.db, []);
  log.push({ participant: profile, cosine: all.cosine.recommendations.slice(0, 5).map(r => [r.program_id, r.score, r.rank]),
    euclidean: all.euclidean.recommendations.slice(0, 5).map(r => [r.program_id, r.score, r.rank]), created_at: result.created_at });
  write(KEY.db, log);
  return result;
}
export const getLastResult = () => readSession(KEY.result);
