import argparse
import json
import math
import sys
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any

import pandas as pd
from sqlalchemy.orm import Session

from backend.config import (
    ASPECTS,
    COLUMN_MAPPING_PATH,
    LABELS,
)
from backend.database import Program, RatingAspek, SessionLocal, Ulasan, init_db
from ml.explain import load_models
from ml.preprocessing import preprocess_text
from ml.train import predict_all


RATING_FIELDS = tuple(ASPECTS)
SYSTEM_FIELDS = {
    "komentar",
    "label",
    "program",
    "nama_peserta",
    "tanggal",
    *ASPECTS,
    "aspek_terkait",
}


def normalize_column_name(value: object) -> str:
    return " ".join(str(value).strip().casefold().replace("_", " ").split())


def load_column_mapping(mapping_path: Path = COLUMN_MAPPING_PATH) -> dict[str, str]:
    mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
    if not isinstance(mapping, dict) or any(
        not isinstance(source, str)
        or not isinstance(target, str)
        or target not in SYSTEM_FIELDS
        for source, target in mapping.items()
    ):
        raise ValueError(
            f"Pemetaan kolom harus berupa objek nama CSV ke field sistem: {mapping_path}"
        )
    normalized_mapping: dict[str, str] = {}
    for source, target in mapping.items():
        normalized_source = normalize_column_name(source)
        if normalized_source in normalized_mapping:
            raise ValueError(
                f"Nama kolom berulang setelah normalisasi: {source}"
            )
        normalized_mapping[normalized_source] = target
    return normalized_mapping


def parse_csv_bytes(content: bytes) -> pd.DataFrame:
    try:
        return pd.read_csv(BytesIO(content), encoding="utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError(
            "CSV harus menggunakan encoding UTF-8 atau UTF-8 dengan BOM."
        ) from exc
    except pd.errors.EmptyDataError as exc:
        raise ValueError("File CSV tidak berisi data.") from exc
    except pd.errors.ParserError as exc:
        raise ValueError(f"Format CSV tidak valid: {exc}") from exc


def map_dataframe_columns(
    dataframe: pd.DataFrame,
    mapping_path: Path = COLUMN_MAPPING_PATH,
    required_fields: set[str] | None = None,
) -> pd.DataFrame:
    mapping = load_column_mapping(mapping_path)
    rename: dict[object, str] = {}
    used_targets: set[str] = set()
    for source_column in dataframe.columns:
        target = mapping.get(normalize_column_name(source_column))
        if target is None:
            continue
        if target in used_targets:
            raise ValueError(
                f"Lebih dari satu kolom CSV dipetakan ke field '{target}'."
            )
        used_targets.add(target)
        rename[source_column] = target

    mapped = dataframe.rename(columns=rename)
    required = required_fields or {"komentar", "program"}
    missing = required - set(mapped.columns)
    if missing:
        raise ValueError(
            "CSV tidak memiliki kolom wajib setelah pemetaan: "
            + ", ".join(sorted(missing))
        )
    return mapped


def _is_empty(value: object) -> bool:
    if value is None:
        return True
    try:
        return bool(pd.isna(value)) or str(value).strip() == ""
    except (TypeError, ValueError):
        return False


def _parse_rating(value: object, field: str) -> int:
    try:
        numeric_value = float(str(value).strip())
    except (TypeError, ValueError) as exc:
        raise ValueError(f"rating {field} harus berupa angka 1-5.") from exc
    if not math.isfinite(numeric_value) or not numeric_value.is_integer():
        raise ValueError(f"rating {field} harus bilangan bulat 1-5.")
    rating = int(numeric_value)
    if not 1 <= rating <= 5:
        raise ValueError(f"rating {field} harus berada pada skala 1-5.")
    return rating


def _parse_date(value: object) -> datetime:
    try:
        parsed = pd.to_datetime(value, errors="raise")
    except (TypeError, ValueError, OverflowError) as exc:
        raise ValueError("tanggal tidak dapat dibaca.") from exc
    if isinstance(parsed, pd.Timestamp):
        return parsed.to_pydatetime().replace(tzinfo=None)
    if isinstance(parsed, datetime):
        return parsed.replace(tzinfo=None)
    raise ValueError("tanggal tidak valid.")


def _prepare_row(row: pd.Series) -> dict[str, Any]:
    comment = row.get("komentar")
    if _is_empty(comment):
        raise ValueError("komentar wajib diisi.")
    program_name = row.get("program")
    if _is_empty(program_name):
        raise ValueError("nama program wajib diisi.")

    label_value = row.get("label")
    label = None if _is_empty(label_value) else str(label_value).strip().casefold()
    if label is not None and label not in LABELS:
        raise ValueError(
            f"label '{label}' tidak dikenal; gunakan: {', '.join(LABELS)}."
        )

    supplied_ratings = {
        aspect: row.get(aspect)
        for aspect in RATING_FIELDS
        if aspect in row.index and not _is_empty(row.get(aspect))
    }
    ratings: dict[str, int] | None = None
    if supplied_ratings:
        parsed_ratings = {
            aspect: _parse_rating(value, aspect)
            for aspect, value in supplied_ratings.items()
        }
        missing_ratings = set(RATING_FIELDS) - set(supplied_ratings)
        if missing_ratings:
            raise ValueError(
                "rating harus lengkap jika ada yang diisi; belum ada: "
                + ", ".join(sorted(missing_ratings))
                + "."
            )
        ratings = parsed_ratings

    aspect_value = row.get("aspek_terkait")
    aspect = (
        "tidak_diketahui"
        if _is_empty(aspect_value)
        else str(aspect_value).strip().casefold()
    )
    if aspect != "tidak_diketahui" and aspect not in ASPECTS:
        raise ValueError(
            f"aspek_terkait harus salah satu dari: {', '.join(ASPECTS)}."
        )

    date_value = row.get("tanggal")
    tanggal = datetime.now() if _is_empty(date_value) else _parse_date(date_value)
    name_value = row.get("nama_peserta")
    return {
        "komentar": str(comment).strip(),
        "label": label,
        "program": str(program_name).strip(),
        "nama_peserta": (
            "Peserta impor"
            if _is_empty(name_value)
            else str(name_value).strip()
        ),
        "tanggal": tanggal,
        "aspek_terkait": aspect,
        "rating": ratings,
    }


def import_dataframe(
    dataframe: pd.DataFrame,
    db: Session,
    mapping_path: Path = COLUMN_MAPPING_PATH,
    source: str = "import",
) -> dict[str, Any]:
    mapped = map_dataframe_columns(dataframe, mapping_path)
    program_rows = db.query(Program).all()
    programs_by_name = {
        program.nama.strip().casefold(): program for program in program_rows
    }
    accepted = 0
    rejected: list[dict[str, Any]] = []

    for row_index, row in mapped.iterrows():
        line_number = int(row_index) + 2
        try:
            values = _prepare_row(row)
            processed = preprocess_text(values["komentar"])
            if not processed:
                raise ValueError(
                    "komentar tidak memiliki kata yang dapat dianalisis setelah preprocessing."
                )
            predictions = predict_all(values["komentar"])
            program_key = values["program"].casefold()
            program = programs_by_name.get(program_key)
            if program is None:
                program = Program(
                    nama=values["program"],
                    deskripsi="Program yang ditambahkan melalui impor data.",
                )
                db.add(program)
                db.flush()
                programs_by_name[program_key] = program

            pred_nb, proba_nb = predictions["MultinomialNB"]
            pred_svm, proba_svm = predictions["SVC"]
            pred_ensemble, proba_ensemble = predictions["Ensemble"]
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
                sumber=source,
            )
            if values["rating"] is not None:
                review.rating = RatingAspek(**values["rating"])
            db.add(review)
            db.commit()
            accepted += 1
        except ValueError as exc:
            db.rollback()
            rejected.append({"baris": line_number, "alasan": str(exc)})

    return {
        "jumlah_baris": len(mapped),
        "masuk": accepted,
        "ditolak": len(rejected),
        "penolakan": rejected,
    }


def import_csv_file(
    csv_path: Path,
    mapping_path: Path = COLUMN_MAPPING_PATH,
) -> dict[str, Any]:
    try:
        dataframe = pd.read_csv(csv_path, encoding="utf-8-sig")
    except (UnicodeDecodeError, pd.errors.EmptyDataError, pd.errors.ParserError) as exc:
        raise ValueError(f"CSV tidak dapat dibaca: {exc}") from exc

    init_db()
    load_models()
    with SessionLocal() as db:
        return import_dataframe(dataframe, db, mapping_path)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Impor ulasan dari CSV ke basis data PERI."
    )
    parser.add_argument("csv", type=Path, help="Lokasi file CSV")
    parser.add_argument(
        "--mapping",
        type=Path,
        default=COLUMN_MAPPING_PATH,
        help="File pemetaan kolom CSV",
    )
    args = parser.parse_args()
    try:
        report = import_csv_file(args.csv, args.mapping)
    except (FileNotFoundError, ValueError, OSError) as exc:
        print(f"Gagal mengimpor CSV: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
