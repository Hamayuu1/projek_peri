import json
import re
from functools import lru_cache
from typing import Final

import pandas as pd
from Sastrawi.Dictionary.ArrayDictionary import ArrayDictionary
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
from Sastrawi.StopWordRemover.StopWordRemover import StopWordRemover
from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory

from backend.config import SLANG_PATH


NEGATION_WORDS: Final[set[str]] = {"tidak", "bukan", "kurang", "jangan", "belum"}


@lru_cache(maxsize=1)
def _load_slang_dictionary() -> dict[str, str]:
    data = json.loads(SLANG_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or any(
        not isinstance(key, str) or not isinstance(value, str)
        for key, value in data.items()
    ):
        raise ValueError(f"Format kamus slang tidak valid: {SLANG_PATH}")
    return {key.lower(): value.lower() for key, value in data.items()}


_stopword_factory = StopWordRemoverFactory()
_stopwords = set(_stopword_factory.get_stop_words()) - NEGATION_WORDS
_stopword_remover = StopWordRemover(ArrayDictionary(list(_stopwords)))
_stemmer = StemmerFactory().create_stemmer()


def preprocess_text(text: object) -> str:
    """Membersihkan, menormalkan slang, menghapus stopword, dan men-stem teks."""
    if pd.isna(text):
        return ""

    return preprocess_steps(str(text))["stemming"]


def preprocess_steps(text: str) -> dict[str, str]:
    """Mengembalikan hasil setiap tahap preprocessing untuk transparansi."""
    case_folding = text.lower()
    cleaned_text = re.sub(r"[^a-z\s]", " ", case_folding)
    cleaned_text = re.sub(r"\s+", " ", cleaned_text).strip()
    slang = _load_slang_dictionary()
    if slang:
        slang_pattern = re.compile(
            r"\b("
            + "|".join(
                re.escape(word) for word in sorted(slang, key=len, reverse=True)
            )
            + r")\b"
        )
        cleaned_text = slang_pattern.sub(
            lambda match: slang[match.group(0)],
            cleaned_text,
        )
    without_stopwords = _stopword_remover.remove(cleaned_text).strip()
    stemmed_text = _stemmer.stem(without_stopwords).strip()
    return {
        "case_folding": case_folding,
        "cleaning": re.sub(r"\s+", " ", re.sub(r"[^a-z\s]", " ", case_folding)).strip(),
        "normalisasi_slang": cleaned_text,
        "stopword_removal": without_stopwords,
        "stemming": stemmed_text,
    }
