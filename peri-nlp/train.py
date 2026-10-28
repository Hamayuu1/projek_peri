"""Melatih model klasifikasi kategori umpan balik PERI.

Kategori: saran, kritik, pertanyaan, kerjasama, lainnya.
Data: dataset_kategori.csv (kolom: teks, label). Tambahkan umpan balik asli PERI ke file ini
agar model makin akurat, lalu jalankan:  python train.py
"""
import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline

from preprocessing import preprocess, bigram_analyzer, STEMMER_NAME

ROOT = Path(__file__).resolve().parent
DATA, MODEL, REPORT = ROOT / "dataset_kategori.csv", ROOT / "model_kategori.joblib", ROOT / "laporan_kategori.json"


def build(jenis, analyzer, param):
    vec = TfidfVectorizer(analyzer=analyzer, min_df=1)
    if jenis == "naive_bayes":
        return make_pipeline(vec, MultinomialNB(alpha=param))
    return make_pipeline(vec, LogisticRegression(C=param, max_iter=2000))


def main():
    df = pd.read_csv(DATA).dropna()
    X, y = df["teks"], df["label"]
    print(f"Data: {len(df)} baris | stemmer: {STEMMER_NAME}\n{y.value_counts().to_string()}\n")
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

    # Bandingkan konfigurasi memakai cross-validation pada data latih saja, lalu pilih yang terbaik.
    skf = StratifiedKFold(5, shuffle=True, random_state=42)
    fitur = {"unigram": preprocess, "unigram+bigram": bigram_analyzer}
    kandidat = [("naive_bayes", a) for a in (0.1, 0.5, 1.0)] + [("logistic_regression", c) for c in (1.0, 10.0)]
    best, best_f1 = None, -1.0
    for jenis, param in kandidat:
        for nama_fitur, an in fitur.items():
            f1 = cross_val_score(build(jenis, an, param), Xtr, ytr, cv=skf, scoring="f1_macro").mean()
            print(f"CV F1-macro {jenis:19s} {nama_fitur:15s} param={param:<5} -> {f1:.4f}")
            if f1 > best_f1:
                best, best_f1 = (jenis, nama_fitur, param), f1
    print(f"\nTerpilih: {best} (CV F1-macro {best_f1:.4f})\n")

    model = build(best[0], fitur[best[1]], best[2]).fit(Xtr, ytr)
    pred = model.predict(Xte)
    acc = accuracy_score(yte, pred)
    p, r, f, _ = precision_recall_fscore_support(yte, pred, average="macro", zero_division=0)
    print("=== Data uji (belum pernah dilihat model) ===")
    print(classification_report(yte, pred, digits=3, zero_division=0))
    labels = sorted(y.unique())
    cm = confusion_matrix(yte, pred, labels=labels)
    print("Confusion matrix (baris=aktual, kolom=prediksi)", labels)
    print(cm, "\n")
    salah = Xte[pred != yte]
    if len(salah):
        print("Contoh salah prediksi:")
        for t, a, b in zip(salah.head(8), yte[pred != yte].head(8), pred[pred != yte][:8]):
            print(f" - [{a} -> {b}] {t[:100]}")

    # Model akhir dilatih ulang dengan seluruh data agar memanfaatkan semua contoh.
    final = build(best[0], fitur[best[1]], best[2]).fit(X, y)
    joblib.dump(final, MODEL)
    REPORT.write_text(json.dumps({
        "jumlah_data": len(df), "data_latih": len(Xtr), "data_uji": len(Xte),
        "konfigurasi": {"algoritma": best[0], "fitur": best[1], "parameter": best[2]},
        "cv_f1_macro": round(best_f1, 4), "accuracy": round(acc, 4), "precision_macro": round(p, 4),
        "recall_macro": round(r, 4), "f1_macro": round(f, 4),
        "confusion_matrix": {"label": labels, "nilai": cm.tolist()},
        "catatan": "Dilatih pada contoh umpan balik yang ditulis manual (bukan data asli peserta PERI). "
                   "Skor di atas belum mencerminkan kinerja pada umpan balik nyata."},
        indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nModel: {MODEL}\nLaporan: {REPORT}")


if __name__ == "__main__":
    main()