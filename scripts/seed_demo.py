import argparse
import json
import random
import sys
from datetime import datetime, timedelta
from typing import Any

import pandas as pd
from backend.config import (
    ASPECTS,
    DATASET_PATH,
    DEMO_PROFILES_PATH,
    LABELS,
    RANDOM_STATE,
)
from backend.database import Program, RatingAspek, SessionLocal, Ulasan, init_db
from ml.explain import load_models
from ml.preprocessing import preprocess_text
from ml.train import predict_all
from scripts.import_csv import (
    _is_empty,
    _parse_date,
    _parse_rating,
    map_dataframe_columns,
)


def _read_profiles() -> list[dict[str, Any]]:
    profiles = json.loads(DEMO_PROFILES_PATH.read_text(encoding="utf-8"))
    if not isinstance(profiles, list) or not profiles:
        raise ValueError(f"Profil program demo tidak valid: {DEMO_PROFILES_PATH}")

    required_aspects = set(ASPECTS)
    for profile in profiles:
        ratings = profile.get("rating_dasar") if isinstance(profile, dict) else None
        if (
            not isinstance(profile, dict)
            or not isinstance(profile.get("program"), str)
            or not isinstance(ratings, dict)
            or set(ratings) != required_aspects
        ):
            raise ValueError(
                "Setiap profil harus memiliki nama program dan rating_dasar "
                f"untuk semua aspek: {DEMO_PROFILES_PATH}"
            )
        for aspect, value in ratings.items():
            if not isinstance(value, (int, float)) or not 1 <= value <= 5:
                raise ValueError(
                    f"Rating dasar {aspect} pada profil demo harus berada pada 1-5."
                )
    return profiles


def _normalize_name(value: str) -> str:
    return " ".join(value.strip().casefold().split())


def _correlated_rating(
    label: str,
    baseline: float,
    generator: random.Random,
) -> int:
    distributions = {
        "positif": ([4, 4, 4, 5, 5], 0.3),
        "netral": ([3, 3, 4, 4], 0.0),
        "negatif": ([1, 2, 2, 3], -0.3),
    }
    if label not in distributions:
        raise ValueError(
            f"Label '{label}' tidak didukung untuk data demo: {', '.join(LABELS)}."
        )
    choices, sentiment_shift = distributions[label]
    profile_shift = (baseline - 3.5) * 0.45
    noise = generator.choices([-1, 0, 1], weights=[1, 6, 1], k=1)[0]
    value = generator.choice(choices) + sentiment_shift + profile_shift + noise
    return min(5, max(1, round(value)))


def _prepare_review_values(
    row: pd.Series,
    row_number: int,
    profiles: list[dict[str, Any]],
    generator: random.Random,
    has_program: bool,
) -> dict[str, Any]:
    comment_value = row.get("komentar")
    if _is_empty(comment_value):
        raise ValueError("komentar wajib diisi.")
    label_value = row.get("label")
    if _is_empty(label_value):
        raise ValueError("label wajib diisi untuk training seed demo.")
    label = str(label_value).strip().casefold()
    if label not in LABELS:
        raise ValueError(f"label '{label}' tidak dikenal.")

    profile = profiles[(row_number - 2) % len(profiles)]
    supplied_program = row.get("program") if has_program else None
    program_name = (
        profile["program"]
        if _is_empty(supplied_program)
        else str(supplied_program).strip()
    )
    matching_profile = next(
        (
            item
            for item in profiles
            if _normalize_name(item["program"]) == _normalize_name(program_name)
        ),
        profile,
    )
    baseline_ratings = matching_profile["rating_dasar"]

    ratings: dict[str, int] = {}
    for aspect in ASPECTS:
        raw_rating = row.get(aspect)
        if _is_empty(raw_rating):
            ratings[aspect] = _correlated_rating(
                label,
                float(baseline_ratings[aspect]),
                generator,
            )
        else:
            ratings[aspect] = _parse_rating(raw_rating, aspect)

    aspect_value = row.get("aspek_terkait")
    aspect = (
        generator.choice(ASPECTS)
        if _is_empty(aspect_value)
        else str(aspect_value).strip().casefold()
    )
    if aspect not in ASPECTS:
        raise ValueError(f"aspek_terkait '{aspect}' tidak dikenal.")

    date_value = row.get("tanggal")
    tanggal = (
        datetime.now() - timedelta(days=generator.randint(0, 150))
        if _is_empty(date_value)
        else _parse_date(date_value)
    )
    name_value = row.get("nama_peserta")
    return {
        "komentar": str(comment_value).strip(),
        "label": label,
        "program": program_name,
        "nama_peserta": (
            f"Peserta Demo {row_number - 1}"
            if _is_empty(name_value)
            else str(name_value).strip()
        ),
        "tanggal": tanggal,
        "aspek_terkait": aspect,
        "rating": ratings,
    }


def seed_demo_data(replace_existing: bool = False) -> int:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset demo tidak ditemukan: {DATASET_PATH}")
    dataframe = pd.read_csv(DATASET_PATH, encoding="utf-8-sig")
    if dataframe.empty:
        raise ValueError("Dataset demo tidak memiliki baris data.")
    mapped = map_dataframe_columns(
        dataframe,
        required_fields={"komentar", "label"},
    )
    profiles = _read_profiles()
    generator = random.Random(RANDOM_STATE)

    init_db()
    load_models()
    with SessionLocal() as db:
        existing_demo_count = (
            db.query(Ulasan).filter(Ulasan.sumber == "demo").count()
        )
        if existing_demo_count and not replace_existing:
            print(
                f"Seed dilewati: sudah ada {existing_demo_count} ulasan demo. "
                "Gunakan --replace untuk menggantinya."
            )
            return 0
        if replace_existing:
            for review in db.query(Ulasan).filter(Ulasan.sumber == "demo").all():
                db.delete(review)
            db.flush()

        prepared_rows: list[dict[str, Any]] = []
        has_program = "program" in mapped.columns
        for row_index, (_, row) in enumerate(mapped.iterrows()):
            prepared_rows.append(
                _prepare_review_values(
                    row,
                    row_index + 2,
                    profiles,
                    generator,
                    has_program,
                )
            )

        programs = db.query(Program).all()
        programs_by_name = {
            _normalize_name(program.nama): program for program in programs
        }
        for profile in profiles:
            key = _normalize_name(profile["program"])
            if key not in programs_by_name:
                program = Program(
                    nama=profile["program"],
                    deskripsi="Program untuk data demonstrasi PERI.",
                )
                db.add(program)
                db.flush()
                programs_by_name[key] = program

        for values in prepared_rows:
            processed = preprocess_text(values["komentar"])
            if not processed:
                raise ValueError(
                    "Komentar dataset tidak memiliki kata yang dapat dianalisis."
                )
            predictions = predict_all(values["komentar"])
            pred_nb, proba_nb = predictions["MultinomialNB"]
            pred_svm, proba_svm = predictions["SVC"]
            pred_ensemble, proba_ensemble = predictions["Ensemble"]
            program = programs_by_name.get(_normalize_name(values["program"]))
            if program is None:
                program = Program(
                    nama=values["program"],
                    deskripsi="Program yang ditambahkan untuk data demonstrasi PERI.",
                )
                db.add(program)
                db.flush()
                programs_by_name[_normalize_name(values["program"])] = program

            review = Ulasan(
                program_id=program.id,
                nama_peserta=values["nama_peserta"],
                komentar_raw=values["komentar"],
                komentar_bersih=processed,
                prediksi_sentimen=pred_ensemble,
                aspek_terkait=values["aspek_terkait"],
                tanggal=values["tanggal"],
                pred_nb=pred_nb,
                pred_svm=pred_svm,
                pred_ensemble=pred_ensemble,
                proba_nb=json.dumps(proba_nb, ensure_ascii=False),
                proba_svm=json.dumps(proba_svm, ensure_ascii=False),
                proba_ensemble=json.dumps(proba_ensemble, ensure_ascii=False),
                label_manual=values["label"],
                sumber="demo",
            )
            review.rating = RatingAspek(**values["rating"])
            db.add(review)
        db.commit()
        return len(prepared_rows)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Isi basis data dengan ulasan demonstrasi yang dapat dihapus."
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Hapus data demo lama sebelum membuat ulang.",
    )
    args = parser.parse_args()
    try:
        inserted = seed_demo_data(replace_existing=args.replace)
    except (FileNotFoundError, ValueError, OSError) as exc:
        print(f"Gagal membuat data demo: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
    if inserted:
        print(f"Berhasil menambahkan {inserted} ulasan demo.")


if __name__ == "__main__":
    main()
