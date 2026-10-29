import assert from 'node:assert/strict';
import { recommendPrograms } from '../recommendation/engine.js';
import { calculate_cosine_similarity, calculate_euclidean_distance } from '../recommendation/similarity.js';
import { evaluate_precision_at_n, evaluateAll } from '../recommendation/evaluation.js';
import { PROGRAMS } from '../data/programs.js';
import { TEST_PROFILES, GROUND_TRUTH } from '../data/test_profiles.js';

assert.equal(calculate_cosine_similarity([1, 0], [1, 0]), 1);
assert.equal(calculate_cosine_similarity([1, 0], [0, 1]), 0);
assert.equal(calculate_euclidean_distance([0, 0], [3, 4]), 5);
const rel = new Set([2, 9]);
assert.equal(evaluate_precision_at_n([{ program_id: 2 }, { program_id: 5 }, { program_id: 9 }], rel, 3), 2 / 3);

const p = { age: 28, employment_status: 'irt', economic_condition: 'kurang_mampu', interests: ['kewirausahaan'], goals: ['kemandirian_ekonomi'] };
for (const m of ['cosine', 'euclidean']) {
  const r = recommendPrograms(p, m, 3);
  assert.equal(r.length, 3); assert.equal(r[0].ranking, 1);
  assert.ok(r[0].similarity_score >= r[1].similarity_score);
}
assert.throws(() => recommendPrograms({ age: 'x' }, 'cosine'));

const ev = evaluateAll({ profiles: TEST_PROFILES, groundTruth: GROUND_TRUTH, programs: PROGRAMS });
console.log('Precision (data DEMO):');
for (const [m, r] of Object.entries(ev.results)) console.log(' ', m, JSON.stringify(r.precision));
console.log('Best:', ev.best, '(diputuskan oleh P@' + ev.decidedBy + ')');
console.log('OK');
