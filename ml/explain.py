from itertools import combinations
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from scipy import sparse
from sklearn.pipeline import Pipeline

from backend.config import MODEL_PATHS
from ml.preprocessing import preprocess_text


MODEL_NAMES = ("MultinomialNB", "SVC", "Ensemble")
_loaded_models: dict[str, Pipeline] | None = None


def load_models(model_paths: dict[str, Path] | None = None) -> dict[str, Pipeline]:
    global _loaded_models
    if model_paths is not None:
        return {name: joblib.load(path) for name, path in model_paths.items()}
    if _loaded_models is None:
        missing_paths = [
            path for path in MODEL_PATHS.values() if not path.exists()
        ]
        if missing_paths:
            raise FileNotFoundError(
                "Artifact model belum tersedia: "
                + ", ".join(str(path) for path in missing_paths)
                + ". Jalankan `python -m ml.train` terlebih dahulu."
            )
        _loaded_models = {
            model_name: joblib.load(path)
            for model_name, path in MODEL_PATHS.items()
        }
    return _loaded_models


def reload_models() -> dict[str, Pipeline]:
    """Muat ulang artifact setelah proses pelatihan selesai."""
    global _loaded_models
    _loaded_models = None
    return load_models()


def _svm_class_coefficients(classifier: Any) -> dict[str, np.ndarray]:
    classes = [str(label) for label in classifier.classes_]
    raw_coefficients = classifier.coef_
    coefficients = (
        raw_coefficients.toarray()
        if sparse.issparse(raw_coefficients)
        else np.asarray(raw_coefficients)
    )
    if len(classes) == 2:
        return {
            classes[0]: -coefficients[0],
            classes[1]: coefficients[0],
        }

    class_coefficients = {
        label: np.zeros(coefficients.shape[1], dtype=float) for label in classes
    }
    for row_index, (first_index, second_index) in enumerate(
        combinations(range(len(classes)), 2)
    ):
        class_coefficients[classes[first_index]] -= coefficients[row_index]
        class_coefficients[classes[second_index]] += coefficients[row_index]
    return class_coefficients


def build_top_words(models: dict[str, Pipeline], limit: int = 10) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for model_name in ("MultinomialNB", "SVC"):
        model = models[model_name]
        vectorizer = model.named_steps["tfidf"]
        classifier = model.named_steps["classifier"]
        feature_names = vectorizer.get_feature_names_out()
        result[model_name] = {}
        if model_name == "MultinomialNB":
            class_scores = {
                str(label): classifier.feature_log_prob_[index]
                for index, label in enumerate(classifier.classes_)
            }
        else:
            class_scores = _svm_class_coefficients(classifier)

        for label, scores in class_scores.items():
            top_indices = np.argsort(scores)[::-1][:limit]
            result[model_name][label] = [
                {
                    "kata": str(feature_names[index]),
                    "skor": float(scores[index]),
                }
                for index in top_indices
            ]
    return result


def predict_all(text: str) -> dict[str, tuple[str, dict[str, float]]]:
    processed_text = preprocess_text(text)
    if not processed_text:
        raise ValueError("Teks tidak berisi kata yang dapat dianalisis.")

    predictions: dict[str, tuple[str, dict[str, float]]] = {}
    for model_name, model in load_models().items():
        classifier = model.named_steps["classifier"]
        probabilities = model.predict_proba([processed_text])[0]
        probability_by_label = {
            str(label): float(probability)
            for label, probability in zip(
                classifier.classes_,
                probabilities,
                strict=True,
            )
        }
        predictions[model_name] = (
            str(model.predict([processed_text])[0]),
            probability_by_label,
        )
    return predictions


def explain_text(text: str, model_name: str) -> dict[str, Any]:
    aliases = {"NB": "MultinomialNB", "SVM": "SVC"}
    resolved_name = aliases.get(model_name, model_name)
    if resolved_name not in MODEL_NAMES:
        raise ValueError(
            "Nama model harus MultinomialNB/NB, SVC/SVM, atau Ensemble."
        )
    processed_text = preprocess_text(text)
    if not processed_text:
        raise ValueError("Teks tidak berisi kata yang dapat dianalisis.")

    model = load_models()[resolved_name]
    vectorizer = model.named_steps["tfidf"]
    predicted_label = str(model.predict([processed_text])[0])
    matrix = vectorizer.transform([processed_text])
    feature_names = vectorizer.get_feature_names_out()
    present_indices = matrix.indices

    if resolved_name == "Ensemble":
        classifier = model.named_steps["classifier"]
        encoded_label = int(classifier.le_.transform([predicted_label])[0])
        contributions_by_model: list[np.ndarray] = []
        for estimator in classifier.estimators_:
            if hasattr(estimator, "feature_log_prob_"):
                class_index = list(estimator.classes_).index(encoded_label)
                feature_scores = estimator.feature_log_prob_[class_index]
            else:
                feature_scores = _svm_class_coefficients(estimator)[
                    str(encoded_label)
                ]
            contributions_by_model.append(
                matrix.data * feature_scores[present_indices]
            )
        contributions = np.mean(contributions_by_model, axis=0)
    elif resolved_name == "MultinomialNB":
        classifier = model.named_steps["classifier"]
        class_index = list(classifier.classes_).index(predicted_label)
        contributions = matrix.data * classifier.feature_log_prob_[
            class_index, present_indices
        ]
    else:
        classifier = model.named_steps["classifier"]
        coefficients = _svm_class_coefficients(classifier)[predicted_label]
        contributions = matrix.data * coefficients[present_indices]

    words = [
        {
            "kata": str(feature_names[index]),
            "kontribusi": float(contribution),
        }
        for index, contribution in zip(
            present_indices,
            contributions,
            strict=True,
        )
    ]
    words.sort(key=lambda word: abs(word["kontribusi"]), reverse=True)
    return {
        "model": resolved_name,
        "prediksi": predicted_label,
        "kata": words,
    }
