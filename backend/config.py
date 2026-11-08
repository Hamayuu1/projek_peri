import os
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DATASET_PATH = ROOT_DIR / "dataset" / "data_ulasan.csv"
MODEL_DIR = ROOT_DIR / "ml"
ARTIFACTS_DIR = MODEL_DIR / "artifacts"
METRICS_PATH = ARTIFACTS_DIR / "metrics.json"
TOP_WORDS_PATH = ARTIFACTS_DIR / "top_words.json"
SLANG_PATH = ROOT_DIR / "data" / "slang.json"
COLUMN_MAPPING_PATH = ROOT_DIR / "data" / "column_mapping.json"
DEMO_PROFILES_PATH = ROOT_DIR / "data" / "demo_profiles.json"
PROGRAMS_PATH = ROOT_DIR / "data" / "programs.json"
DATABASE_PATH = ROOT_DIR / "backend" / "peri.db"
FRONTEND_DIR = ROOT_DIR / "frontend"

MODEL_PATHS = {
    "MultinomialNB": ARTIFACTS_DIR / "model_nb.pkl",
    "SVC": ARTIFACTS_DIR / "model_svm.pkl",
    "Ensemble": ARTIFACTS_DIR / "model_ensemble.pkl",
}

ASPECTS: tuple[str, ...] = (
    "fasilitas",
    "pengajar",
    "materi",
    "pelaksanaan",
    "pelayanan",
    "manfaat",
)
LABELS: tuple[str, ...] = ("positif", "netral", "negatif")
N_SPLITS = 5
RANDOM_STATE = 42
ADMIN_TOKEN = os.getenv("PERI_ADMIN_TOKEN", "")


def _read_demo_mode(value: str | None) -> bool:
    if value is None:
        return True

    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise ValueError("PERI_DEMO_MODE harus bernilai true atau false.")


DEMO_MODE = _read_demo_mode(os.getenv("PERI_DEMO_MODE"))
