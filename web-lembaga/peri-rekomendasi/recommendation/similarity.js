// TAHAP 5–6 — Dua ukuran kemiripan yang dibandingkan dalam penelitian.

/** Cosine Similarity = (A·B) / (‖A‖ ‖B‖). Rentang 0–1 (vektor tidak negatif). Makin besar makin mirip. */
export function calculate_cosine_similarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/** Euclidean Distance = √Σ(Aᵢ − Bᵢ)². Makin KECIL makin mirip. */
export function calculate_euclidean_distance(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

/** Konversi jarak -> skor kesesuaian 0–1 agar sebanding dengan Cosine: 1 / (1 + d). Urutan ranking tidak berubah. */
export const euclideanToSimilarity = d => 1 / (1 + d);
