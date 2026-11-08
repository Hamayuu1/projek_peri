import pytest

from ml.train import predict_all


def test_predict_all_returns_three_models_with_normalized_probabilities(
    trained_models: dict[str, object],
) -> None:
    predictions = predict_all("Pendamping sangat ramah dan program bermanfaat.")

    assert set(predictions) == {"MultinomialNB", "SVC", "Ensemble"}
    for label, probabilities in predictions.values():
        assert label in {"positif", "negatif"}
        assert probabilities
        assert sum(probabilities.values()) == pytest.approx(1.0, abs=1e-6)
