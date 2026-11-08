from ml.preprocessing import preprocess_text


def test_preprocess_text_preserves_negation_and_normalizes_slang() -> None:
    processed = preprocess_text("Gak bagus bgt")

    assert "tidak" in processed.split()
    assert "gak" not in processed.split()
    assert "banget" in processed.split()
