import json
import time
import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.base import BaseEstimator
from sklearn.ensemble import VotingClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)
from sklearn.model_selection import StratifiedKFold, cross_val_predict, cross_val_score
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.svm import SVC

from backend.config import (
    DATASET_PATH,
    METRICS_PATH,
    MODEL_PATHS,
    N_SPLITS,
    RANDOM_STATE,
    TOP_WORDS_PATH,
)
from ml.explain import build_top_words, predict_all as _predict_all
from ml.preprocessing import preprocess_text


def predict_all(text: str) -> dict[str, tuple[str, dict[str, float]]]:
    """Prediksi tiga model melalui artifact yang sudah dilatih."""
    return _predict_all(text)


def build_pipeline(classifier: BaseEstimator) -> Pipeline:
    return Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True),
            ),
            ("classifier", classifier),
        ]
    )


def build_models() -> dict[str, Pipeline]:
    naive_bayes = MultinomialNB()
    svm = SVC(
        kernel="linear",
        probability=True,
        class_weight="balanced",
        random_state=RANDOM_STATE,
    )
    ensemble = VotingClassifier(
        estimators=[
            ("naive_bayes", MultinomialNB()),
            (
                "svc",
                SVC(
                    kernel="linear",
                    probability=True,
                    class_weight="balanced",
                    random_state=RANDOM_STATE,
                ),
            ),
        ],
        voting="soft",
    )
    return {
        "MultinomialNB": build_pipeline(naive_bayes),
        "SVC": build_pipeline(svm),
        "Ensemble": build_pipeline(ensemble),
    }


def _model_parameters() -> dict[str, dict[str, Any]]:
    vectorizer_parameters = {
        "ngram_range": [1, 2],
        "sublinear_tf": True,
        "use_idf": True,
        "smooth_idf": True,
        "norm": "l2",
    }
    return {
        "MultinomialNB": {
            "vectorizer": vectorizer_parameters,
            "classifier": {"name": "MultinomialNB", "alpha": 1.0},
        },
        "SVC": {
            "vectorizer": vectorizer_parameters,
            "classifier": {
                "name": "SVC",
                "C": 1.0,
                "kernel": "linear",
                "probability": True,
                "class_weight": "balanced",
                "random_state": RANDOM_STATE,
            },
        },
        "Ensemble": {
            "vectorizer": vectorizer_parameters,
            "classifier": {
                "name": "VotingClassifier",
                "voting": "soft",
                "estimators": [
                    {"name": "MultinomialNB", "alpha": 1.0},
                    {
                        "name": "SVC",
                        "C": 1.0,
                        "kernel": "linear",
                        "probability": True,
                        "class_weight": "balanced",
                        "random_state": RANDOM_STATE,
                    },
                ],
                "svc_kernel": "linear",
            },
        },
    }


def _evaluate_model(
    model: Pipeline,
    texts: pd.Series,
    labels: pd.Series,
    class_labels: list[str],
    cv: StratifiedKFold,
) -> dict[str, Any]:
    predictions = cross_val_predict(model, texts, labels, cv=cv, method="predict")
    fold_accuracies = cross_val_score(model, texts, labels, cv=cv, scoring="accuracy")
    precision, recall, f1, _ = precision_recall_fscore_support(
        labels,
        predictions,
        labels=class_labels,
        zero_division=0,
    )
    report = classification_report(
        labels,
        predictions,
        labels=class_labels,
        target_names=class_labels,
        zero_division=0,
        output_dict=True,
    )
    return {
        "accuracy": {
            "mean": float(fold_accuracies.mean()),
            "std": float(fold_accuracies.std()),
        },
        "per_class": {
            label: {
                "precision": float(precision[index]),
                "recall": float(recall[index]),
                "f1": float(f1[index]),
            }
            for index, label in enumerate(class_labels)
        },
        "macro_f1": float(f1_score(labels, predictions, labels=class_labels, average="macro")),
        "confusion_matrix": confusion_matrix(
            labels,
            predictions,
            labels=class_labels,
        ).tolist(),
        "classification_report": report,
    }


def train_pipeline(
    dataset_path: Path = DATASET_PATH,
    artifacts_dir: Path | None = None,
    training_data: pd.DataFrame | None = None,
) -> dict[str, Any]:
    if training_data is None:
        if not dataset_path.exists():
            raise FileNotFoundError(
                f"Dataset tidak ditemukan: {dataset_path}. "
                "Pastikan CSV memiliki kolom 'komentar' dan 'label'."
            )
        data = pd.read_csv(dataset_path)
    else:
        data = training_data.copy()
    required_columns = {"komentar", "label"}
    missing_columns = required_columns - set(data.columns)
    if missing_columns:
        raise ValueError(
            "Kolom dataset tidak lengkap. Kolom yang wajib ada: "
            + ", ".join(sorted(missing_columns))
        )

    data = data.dropna(subset=["komentar", "label"]).copy()
    if data.empty:
        raise ValueError("Dataset tidak memiliki baris berlabel yang dapat dilatih.")

    data["label"] = data["label"].astype(str)
    data["komentar_bersih"] = data["komentar"].apply(preprocess_text)
    class_distribution = data["label"].value_counts().sort_index()
    class_labels = sorted(class_distribution.index.tolist())
    smallest_class_size = int(class_distribution.min())
    for label, count in class_distribution.items():
        if count < N_SPLITS:
            warnings.warn(
                f"Kelas '{label}' hanya memiliki {count} sampel; "
                f"disarankan minimal {N_SPLITS} untuk evaluasi silang.",
                UserWarning,
                stacklevel=2,
            )
    if smallest_class_size < 2:
        raise ValueError(
            "Evaluasi StratifiedKFold memerlukan sedikitnya 2 sampel untuk setiap kelas."
        )

    n_splits = min(N_SPLITS, smallest_class_size)
    cv = StratifiedKFold(
        n_splits=n_splits,
        shuffle=True,
        random_state=RANDOM_STATE,
    )
    models = build_models()
    metrics: dict[str, dict[str, Any]] = {}
    texts = data["komentar_bersih"]
    labels = data["label"]

    training_started = datetime.now(timezone.utc)
    started_at = time.perf_counter()
    for model_name, model in models.items():
        metrics[model_name] = _evaluate_model(
            model,
            texts,
            labels,
            class_labels,
            cv,
        )
    evaluation_duration = time.perf_counter() - started_at

    for model in models.values():
        model.fit(texts, labels)
    best_model = max(
        metrics,
        key=lambda model_name: metrics[model_name]["macro_f1"],
    )
    artifacts_path = artifacts_dir or METRICS_PATH.parent
    artifacts_path.mkdir(parents=True, exist_ok=True)
    model_paths = {
        model_name: artifacts_path / MODEL_PATHS[model_name].name
        for model_name in models
    }
    for model_name, model in models.items():
        joblib.dump(model, model_paths[model_name])

    training_duration = time.perf_counter() - started_at
    metrics_path = artifacts_path / METRICS_PATH.name
    top_words_path = artifacts_path / TOP_WORDS_PATH.name
    metrics_payload: dict[str, Any] = {
        "waktu_latih": {
            "mulai": training_started.isoformat(),
            "selesai": datetime.now(timezone.utc).isoformat(),
            "durasi_evaluasi_detik": round(evaluation_duration, 4),
            "durasi_total_detik": round(training_duration, 4),
        },
        "jumlah_data": int(len(data)),
        "distribusi_kelas": {
            label: int(count) for label, count in class_distribution.items()
        },
        "daftar_label": class_labels,
        "n_splits": n_splits,
        "parameter_model": _model_parameters(),
        "metrik_model": metrics,
        "model_terbaik_macro_f1": best_model,
    }
    metrics_path.write_text(
        json.dumps(metrics_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    top_words_path.write_text(
        json.dumps(build_top_words(models), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    _print_comparison(metrics)
    print(f"\nModel dan metrik disimpan di: {artifacts_path}")
    print(f"Model terbaik berdasarkan macro F1: {best_model}")
    return metrics_payload


def _print_comparison(metrics: dict[str, dict[str, Any]]) -> None:
    print("\nPerbandingan model (StratifiedKFold)")
    print(f"{'Model':<16} {'Akurasi (mean +/- std)':<25} {'Macro F1':>10}")
    print("-" * 54)
    for model_name, values in metrics.items():
        accuracy = values["accuracy"]
        accuracy_summary = (
            f"{accuracy['mean']:.4f} +/- {accuracy['std']:.4f}"
        )
        print(
            f"{model_name:<16} "
            f"{accuracy_summary:<25}"
            f" {values['macro_f1']:>10.4f}"
        )


def main() -> None:
    train_pipeline()


if __name__ == "__main__":
    main()
