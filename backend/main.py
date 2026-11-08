import json
import secrets
from collections import Counter, defaultdict
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Annotated, Any, AsyncGenerator, Generator, Literal

import pandas as pd
from fastapi import (
    Depends,
    FastAPI,
    File,
    Header,
    HTTPException,
    Query,
    Request,
    UploadFile,
)
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session, selectinload

from backend.config import (
    ASPECTS,
    ADMIN_TOKEN,
    DEMO_MODE,
    FRONTEND_DIR,
    LABELS,
    METRICS_PATH,
    MODEL_PATHS,
    TOP_WORDS_PATH,
)
from backend.database import Program, RatingAspek, SessionLocal, Ulasan, init_db
from ml.explain import explain_text, load_models, reload_models
from ml.preprocessing import preprocess_steps, preprocess_text
from ml.train import predict_all, train_pipeline
from scripts.import_csv import import_dataframe, parse_csv_bytes


ModelPilihan = Literal["ensemble", "nb", "svm"]
MODEL_NAMES: dict[ModelPilihan, str] = {
    "ensemble": "Ensemble",
    "nb": "MultinomialNB",
    "svm": "SVC",
}
PREDICTION_COLUMNS: dict[ModelPilihan, str] = {
    "ensemble": "pred_ensemble",
    "nb": "pred_nb",
    "svm": "pred_svm",
}


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    init_db()
    missing_models = [path for path in MODEL_PATHS.values() if not path.exists()]
    if missing_models:
        missing_paths = ", ".join(str(path) for path in missing_models)
        raise RuntimeError(
            f"Model belum lengkap: {missing_paths}. "
            "Jalankan `python -m ml.train` sebelum menjalankan API."
        )
    load_models()
    yield


app = FastAPI(
    title="PERI - Analisis Sentimen Ulasan",
    description="API untuk menyimpan ulasan dan menyajikan analisis sentimen peserta.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class InputUlasan(BaseModel):
    program_id: int = Field(gt=0)
    nama_peserta: str = Field(min_length=1, max_length=150)
    komentar: str = Field(min_length=1, max_length=10000)
    aspek_terkait: str = Field(min_length=1, max_length=100)
    fasilitas: int = Field(ge=1, le=5)
    pengajar: int = Field(ge=1, le=5)
    materi: int = Field(ge=1, le=5)
    pelaksanaan: int = Field(ge=1, le=5)
    pelayanan: int = Field(ge=1, le=5)
    manfaat: int = Field(ge=1, le=5)

    @field_validator("aspek_terkait")
    @classmethod
    def validate_aspek_terkait(cls, value: str) -> str:
        if value not in ASPECTS:
            raise ValueError("Aspek komentar harus sesuai dengan daftar aspek.")
        return value


class InputAnalisis(BaseModel):
    komentar: str = Field(min_length=1, max_length=10000)


class ConfigResponse(BaseModel):
    demo_mode: bool
    aspects: list[str]
    labels: list[str]


class ProgramResponse(BaseModel):
    id: int
    nama: str
    deskripsi: str


class PrediksiModelResponse(BaseModel):
    prediksi: str
    probabilitas: dict[str, float]


class UlasanDibuatResponse(BaseModel):
    id: int
    program_id: int
    prediksi_sentimen: str
    pred_nb: str
    pred_svm: str
    pred_ensemble: str
    proba_nb: dict[str, float]
    proba_svm: dict[str, float]
    proba_ensemble: dict[str, float]
    komentar_bersih: str
    tanggal: datetime
    message: str


class AkurasiResponse(BaseModel):
    mean: float
    std: float


class MetrikKelasResponse(BaseModel):
    precision: float
    recall: float
    f1: float


class MetrikModelResponse(BaseModel):
    accuracy: AkurasiResponse
    per_class: dict[str, MetrikKelasResponse]
    macro_f1: float
    confusion_matrix: list[list[int]]
    classification_report: dict[str, Any]


class MetricsResponse(BaseModel):
    waktu_latih: dict[str, Any]
    jumlah_data: int
    distribusi_kelas: dict[str, int]
    daftar_label: list[str]
    n_splits: int
    parameter_model: dict[str, Any]
    metrik_model: dict[str, MetrikModelResponse]
    model_terbaik_macro_f1: str


class KataTeratasResponse(BaseModel):
    kata: str
    skor: float


TopWordsResponse = dict[str, dict[str, list[KataTeratasResponse]]]


class DistribusiSentimenResponse(BaseModel):
    jumlah: int
    persen: float


class ProgramRingkasanResponse(BaseModel):
    id: int
    nama: str
    total_ulasan: int
    distribusi_sentimen: dict[str, DistribusiSentimenResponse]
    rata_rata_rating: float | None
    rata_rata_aspek: dict[str, float | None]


class OverviewResponse(BaseModel):
    model: ModelPilihan
    total_ulasan: int
    distribusi_sentimen: dict[str, DistribusiSentimenResponse]
    rata_rata_rating: float | None
    rata_rata_aspek: dict[str, float | None]
    program: list[ProgramRingkasanResponse]


class TrenBulananResponse(BaseModel):
    bulan: str
    distribusi_sentimen: dict[str, int]


class UlasanDetailResponse(BaseModel):
    id: int
    program_id: int
    nama_peserta: str
    komentar: str
    komentar_bersih: str
    tanggal: datetime
    aspek_terkait: str
    prediksi_sentimen: str
    pred_nb: str
    pred_svm: str
    pred_ensemble: str
    proba_nb: dict[str, float]
    proba_svm: dict[str, float]
    proba_ensemble: dict[str, float]
    label_manual: str | None
    sumber: str
    model_berbeda: bool
    rating: dict[str, int] | None


class ProgramDetailInfoResponse(BaseModel):
    id: int
    nama: str
    deskripsi: str


class ProgramDetailResponse(BaseModel):
    program: ProgramDetailInfoResponse
    model: ModelPilihan
    total_ulasan: int
    distribusi_sentimen: dict[str, DistribusiSentimenResponse]
    rata_rata_rating: float | None
    rata_rata_aspek: dict[str, float | None]
    persen_positif_per_aspek: dict[str, float | None]
    persen_negatif_per_aspek: dict[str, float | None]
    tren_bulanan: list[TrenBulananResponse]
    limit: int
    offset: int
    ulasan: list[UlasanDetailResponse]


class KataKontribusiResponse(BaseModel):
    kata: str
    kontribusi: float


class PenjelasanResponse(BaseModel):
    id: int
    model: ModelPilihan
    prediksi: str
    kata: list[KataKontribusiResponse]


class LangkahPreprocessingResponse(BaseModel):
    case_folding: str
    cleaning: str
    normalisasi_slang: str
    stopword_removal: str
    stemming: str


class AnalisisResponse(BaseModel):
    komentar: str
    preprocessing: LangkahPreprocessingResponse
    komentar_bersih: str
    prediksi: dict[str, PrediksiModelResponse]
    penjelasan: dict[str, PenjelasanResponse]


class ImportPenolakanResponse(BaseModel):
    baris: int
    alasan: str


class ImportCSVResponse(BaseModel):
    jumlah_baris: int
    masuk: int
    ditolak: int
    penolakan: list[ImportPenolakanResponse]


class DemoDataDeletedResponse(BaseModel):
    terhapus: int
    message: str


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DbSession = Annotated[Session, Depends(get_db)]


def verify_admin_token(
    token: Annotated[str | None, Header(alias="X-Admin-Token")] = None,
) -> None:
    if not ADMIN_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="Endpoint admin belum diaktifkan. Atur PERI_ADMIN_TOKEN.",
        )
    if token is None or not secrets.compare_digest(token, ADMIN_TOKEN):
        raise HTTPException(
            status_code=401,
            detail="Token admin tidak valid.",
        )


AdminAccess = Annotated[None, Depends(verify_admin_token)]


@app.exception_handler(RequestValidationError)
async def handle_request_validation_error(
    _: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    localized_errors = [
        {
            "field": ".".join(str(part) for part in error["loc"] if part != "body"),
            "message": _validation_message(error["type"]),
        }
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Data permintaan tidak valid.",
            "errors": localized_errors,
        },
    )


def _validation_message(error_type: str) -> str:
    messages = {
        "missing": "Kolom ini wajib diisi.",
        "string_too_short": "Teks lebih pendek dari batas minimum.",
        "string_too_long": "Teks melebihi batas maksimum.",
        "greater_than": "Nilai harus lebih besar dari batas minimum.",
        "greater_than_equal": "Nilai di bawah batas minimum.",
        "less_than_equal": "Nilai melebihi batas maksimum.",
        "int_parsing": "Nilai harus berupa bilangan bulat.",
        "string_type": "Nilai harus berupa teks.",
        "literal_error": "Nilai pilihan tidak dikenal.",
    }
    return messages.get(error_type, "Nilai tidak sesuai dengan format yang diminta.")


def _model_labels(model: ModelPilihan) -> list[str]:
    model_object = load_models()[MODEL_NAMES[model]]
    classifier = model_object.named_steps["classifier"]
    return [str(label) for label in classifier.classes_]


def _prediction_for_review(review: Ulasan, model: ModelPilihan) -> str:
    return str(getattr(review, PREDICTION_COLUMNS[model]))


def _distribution(
    reviews: list[Ulasan],
    model: ModelPilihan,
) -> dict[str, DistribusiSentimenResponse]:
    counts = Counter(_prediction_for_review(review, model) for review in reviews)
    labels = _model_labels(model)
    labels.extend(label for label in counts if label not in labels)
    total = len(reviews)
    return {
        label: DistribusiSentimenResponse(
            jumlah=counts[label],
            persen=round(counts[label] * 100 / total, 2) if total else 0.0,
        )
        for label in labels
    }


def _ratings_summary(
    reviews: list[Ulasan],
) -> tuple[float | None, dict[str, float | None]]:
    aspect_values: dict[str, list[int]] = {aspect: [] for aspect in ASPECTS}
    for review in reviews:
        if review.rating is None:
            continue
        for aspect in ASPECTS:
            aspect_values[aspect].append(getattr(review.rating, aspect))

    all_values = [value for values in aspect_values.values() for value in values]
    average_rating = (
        round(sum(all_values) / len(all_values), 2) if all_values else None
    )
    averages = {
        aspect: (
            round(sum(values) / len(values), 2) if values else None
        )
        for aspect, values in aspect_values.items()
    }
    return average_rating, averages


def _program_summary(
    program: Program,
    reviews: list[Ulasan],
    model: ModelPilihan,
) -> ProgramRingkasanResponse:
    average_rating, average_aspects = _ratings_summary(reviews)
    return ProgramRingkasanResponse(
        id=program.id,
        nama=program.nama,
        total_ulasan=len(reviews),
        distribusi_sentimen=_distribution(reviews, model),
        rata_rata_rating=average_rating,
        rata_rata_aspek=average_aspects,
    )


def _review_response(review: Ulasan) -> UlasanDetailResponse:
    return UlasanDetailResponse(
        id=review.id,
        program_id=review.program_id,
        nama_peserta=review.nama_peserta,
        komentar=review.komentar_raw,
        komentar_bersih=review.komentar_bersih,
        tanggal=review.tanggal,
        aspek_terkait=review.aspek_terkait,
        prediksi_sentimen=review.prediksi_sentimen,
        pred_nb=review.pred_nb,
        pred_svm=review.pred_svm,
        pred_ensemble=review.pred_ensemble,
        proba_nb=json.loads(review.proba_nb),
        proba_svm=json.loads(review.proba_svm),
        proba_ensemble=json.loads(review.proba_ensemble),
        label_manual=review.label_manual,
        sumber=review.sumber,
        model_berbeda=not (
            review.pred_nb == review.pred_svm == review.pred_ensemble
        ),
        rating=(
            {aspect: getattr(review.rating, aspect) for aspect in ASPECTS}
            if review.rating is not None
            else None
        ),
    )


def _explanation_response(
    review_id: int,
    explanation: dict[str, Any],
    model: ModelPilihan,
) -> PenjelasanResponse:
    return PenjelasanResponse(
        id=review_id,
        model=model,
        prediksi=explanation["prediksi"],
        kata=explanation["kata"],
    )


def _http_explain(review: Ulasan, model: ModelPilihan) -> PenjelasanResponse:
    model_name = MODEL_NAMES[model]
    try:
        explanation = explain_text(review.komentar_raw, model_name)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail="Model belum tersedia untuk membuat penjelasan.",
        ) from exc
    return _explanation_response(review.id, explanation, model)


@app.get("/api/config", response_model=ConfigResponse)
def get_config() -> ConfigResponse:
    return ConfigResponse(
        demo_mode=DEMO_MODE,
        aspects=list(ASPECTS),
        labels=list(LABELS),
    )


@app.get("/api/program", response_model=list[ProgramResponse])
def get_programs(db: DbSession) -> list[ProgramResponse]:
    programs = db.query(Program).order_by(Program.id).all()
    return [
        ProgramResponse(
            id=program.id,
            nama=program.nama,
            deskripsi=program.deskripsi,
        )
        for program in programs
    ]


@app.get("/api/metrics", response_model=MetricsResponse)
def get_metrics() -> MetricsResponse:
    if not METRICS_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="Metrik pelatihan belum tersedia. Jalankan `python -m ml.train`.",
        )
    try:
        return MetricsResponse.model_validate_json(
            METRICS_PATH.read_text(encoding="utf-8")
        )
    except (ValueError, OSError) as exc:
        raise HTTPException(
            status_code=500,
            detail="File metrik tidak dapat dibaca atau formatnya tidak valid.",
        ) from exc


@app.get("/api/top-words", response_model=TopWordsResponse)
def get_top_words() -> TopWordsResponse:
    if not TOP_WORDS_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="Daftar kata teratas belum tersedia. Jalankan `python -m ml.train`.",
        )
    try:
        return json.loads(TOP_WORDS_PATH.read_text(encoding="utf-8"))
    except (ValueError, OSError) as exc:
        raise HTTPException(
            status_code=500,
            detail="File kata teratas tidak dapat dibaca atau formatnya tidak valid.",
        ) from exc


@app.post(
    "/api/ulasan",
    status_code=201,
    response_model=UlasanDibuatResponse,
)
def create_ulasan(
    payload: InputUlasan,
    db: DbSession,
) -> UlasanDibuatResponse:
    program = db.get(Program, payload.program_id)
    if program is None:
        raise HTTPException(status_code=404, detail="Program tidak ditemukan.")

    komentar_bersih = preprocess_text(payload.komentar)
    if not komentar_bersih:
        raise HTTPException(
            status_code=422,
            detail="Komentar tidak berisi kata yang dapat dianalisis setelah preprocessing.",
        )
    try:
        predictions = predict_all(payload.komentar)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail="Model belum tersedia. Jalankan `python -m ml.train` terlebih dahulu.",
        ) from exc

    pred_nb, proba_nb = predictions["MultinomialNB"]
    pred_svm, proba_svm = predictions["SVC"]
    pred_ensemble, proba_ensemble = predictions["Ensemble"]
    tanggal = datetime.now()
    ulasan = Ulasan(
        program_id=payload.program_id,
        nama_peserta=payload.nama_peserta.strip(),
        komentar_raw=payload.komentar.strip(),
        komentar_bersih=komentar_bersih,
        prediksi_sentimen=pred_ensemble,
        aspek_terkait=payload.aspek_terkait,
        tanggal=tanggal,
        pred_nb=pred_nb,
        pred_svm=pred_svm,
        pred_ensemble=pred_ensemble,
        proba_nb=json.dumps(proba_nb, ensure_ascii=False),
        proba_svm=json.dumps(proba_svm, ensure_ascii=False),
        proba_ensemble=json.dumps(proba_ensemble, ensure_ascii=False),
        sumber="demo" if DEMO_MODE else "form",
    )
    ulasan.rating = RatingAspek(
        **{aspect: getattr(payload, aspect) for aspect in ASPECTS}
    )
    db.add(ulasan)
    try:
        db.commit()
        db.refresh(ulasan)
    except Exception:
        db.rollback()
        raise

    return UlasanDibuatResponse(
        id=ulasan.id,
        program_id=ulasan.program_id,
        prediksi_sentimen=ulasan.prediksi_sentimen,
        pred_nb=ulasan.pred_nb,
        pred_svm=ulasan.pred_svm,
        pred_ensemble=ulasan.pred_ensemble,
        proba_nb=proba_nb,
        proba_svm=proba_svm,
        proba_ensemble=proba_ensemble,
        komentar_bersih=ulasan.komentar_bersih,
        tanggal=ulasan.tanggal,
        message="Ulasan berhasil disimpan.",
    )


@app.get("/api/overview", response_model=OverviewResponse)
def get_overview(
    db: DbSession,
    model: ModelPilihan = Query(default="ensemble"),
) -> OverviewResponse:
    programs = (
        db.query(Program)
        .options(selectinload(Program.ulasan).selectinload(Ulasan.rating))
        .order_by(Program.id)
        .all()
    )
    all_reviews = [review for program in programs for review in program.ulasan]
    average_rating, average_aspects = _ratings_summary(all_reviews)
    summaries = [
        _program_summary(program, list(program.ulasan), model)
        for program in programs
    ]
    return OverviewResponse(
        model=model,
        total_ulasan=len(all_reviews),
        distribusi_sentimen=_distribution(all_reviews, model),
        rata_rata_rating=average_rating,
        rata_rata_aspek=average_aspects,
        program=summaries,
    )


@app.get(
    "/api/program/{program_id}/detail",
    response_model=ProgramDetailResponse,
)
def get_program_detail(
    program_id: int,
    db: DbSession,
    model: ModelPilihan = Query(default="ensemble"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> ProgramDetailResponse:
    program = db.query(Program).filter(Program.id == program_id).first()
    if program is None:
        raise HTTPException(status_code=404, detail="Program tidak ditemukan.")

    reviews = (
        db.query(Ulasan)
        .options(selectinload(Ulasan.rating))
        .filter(Ulasan.program_id == program_id)
        .order_by(Ulasan.tanggal.desc(), Ulasan.id.desc())
        .all()
    )
    average_rating, average_aspects = _ratings_summary(reviews)
    aspect_totals: Counter[str] = Counter()
    positive_totals: Counter[str] = Counter()
    negative_totals: Counter[str] = Counter()
    monthly_totals: dict[str, Counter[str]] = defaultdict(Counter)
    for review in reviews:
        aspect = review.aspek_terkait
        aspect_totals[aspect] += 1
        prediction = _prediction_for_review(review, model).casefold()
        if prediction == "positif":
            positive_totals[aspect] += 1
        elif prediction == "negatif":
            negative_totals[aspect] += 1
        month = review.tanggal.strftime("%Y-%m")
        monthly_totals[month][prediction] += 1

    positive_percentages = {
        aspect: (
            round(positive_totals[aspect] * 100 / aspect_totals[aspect], 2)
            if aspect_totals[aspect]
            else None
        )
        for aspect in ASPECTS
    }
    negative_percentages = {
        aspect: (
            round(negative_totals[aspect] * 100 / aspect_totals[aspect], 2)
            if aspect_totals[aspect]
            else None
        )
        for aspect in ASPECTS
    }
    sentiment_labels = _model_labels(model)
    monthly_trends = [
        TrenBulananResponse(
            bulan=month,
            distribusi_sentimen={
                label: counts[label] for label in sentiment_labels
            },
        )
        for month, counts in sorted(monthly_totals.items())
    ]
    page_reviews = reviews[offset : offset + limit]

    return ProgramDetailResponse(
        program=ProgramDetailInfoResponse(
            id=program.id,
            nama=program.nama,
            deskripsi=program.deskripsi,
        ),
        model=model,
        total_ulasan=len(reviews),
        distribusi_sentimen=_distribution(reviews, model),
        rata_rata_rating=average_rating,
        rata_rata_aspek=average_aspects,
        persen_positif_per_aspek=positive_percentages,
        persen_negatif_per_aspek=negative_percentages,
        tren_bulanan=monthly_trends,
        limit=limit,
        offset=offset,
        ulasan=[_review_response(review) for review in page_reviews],
    )


@app.get(
    "/api/ulasan/{ulasan_id}/explain",
    response_model=PenjelasanResponse,
)
def get_ulasan_explanation(
    ulasan_id: int,
    db: DbSession,
    model: ModelPilihan = Query(default="ensemble"),
) -> PenjelasanResponse:
    review = db.get(Ulasan, ulasan_id)
    if review is None:
        raise HTTPException(status_code=404, detail="Ulasan tidak ditemukan.")
    return _http_explain(review, model)


@app.post("/api/analisis", response_model=AnalisisResponse)
def analyze_comment(payload: InputAnalisis) -> AnalisisResponse:
    steps = preprocess_steps(payload.komentar)
    if not steps["stemming"]:
        raise HTTPException(
            status_code=422,
            detail="Komentar tidak berisi kata yang dapat dianalisis setelah preprocessing.",
        )
    try:
        predictions = predict_all(payload.komentar)
        explanations = {
            model_key: explain_text(payload.komentar, model_name)
            for model_key, model_name in MODEL_NAMES.items()
        }
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail="Model belum tersedia. Jalankan `python -m ml.train` terlebih dahulu.",
        ) from exc

    prediction_response = {
        model_key: PrediksiModelResponse(
            prediksi=predictions[model_name][0],
            probabilitas=predictions[model_name][1],
        )
        for model_key, model_name in MODEL_NAMES.items()
    }
    explanation_response = {
        model_key: _explanation_response(
            0,
            explanations[model_key],
            model_key,
        )
        for model_key in MODEL_NAMES
    }
    return AnalisisResponse(
        komentar=payload.komentar,
        preprocessing=LangkahPreprocessingResponse(**steps),
        komentar_bersih=steps["stemming"],
        prediksi=prediction_response,
        penjelasan=explanation_response,
    )


@app.post(
    "/api/admin/import",
    response_model=ImportCSVResponse,
)
def import_csv_endpoint(
    _: AdminAccess,
    db: DbSession,
    file: Annotated[UploadFile, File(description="File CSV yang akan diimpor")],
) -> ImportCSVResponse:
    if not file.filename or Path(file.filename).suffix.casefold() != ".csv":
        raise HTTPException(
            status_code=400,
            detail="Unggah file dengan ekstensi .csv.",
        )
    try:
        content = file.file.read()
        dataframe = parse_csv_bytes(content)
        report = import_dataframe(dataframe, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail="Artifact model belum tersedia untuk mengimpor data.",
        ) from exc
    return ImportCSVResponse.model_validate(report)


@app.post("/api/admin/retrain", response_model=MetricsResponse)
def retrain_models(
    _: AdminAccess,
    db: DbSession,
) -> MetricsResponse:
    labeled_reviews = (
        db.query(Ulasan)
        .filter(Ulasan.label_manual.is_not(None))
        .order_by(Ulasan.id)
        .all()
    )
    training_data = (
        pd.DataFrame(
            [
                {"komentar": review.komentar_raw, "label": review.label_manual}
                for review in labeled_reviews
            ]
        )
        if labeled_reviews
        else None
    )
    try:
        metrics = train_pipeline(training_data=training_data)
        reload_models()
    except (ValueError, FileNotFoundError, OSError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Pelatihan ulang gagal karena data atau artifact tidak valid: {exc}",
        ) from exc
    return MetricsResponse.model_validate(metrics)


@app.delete(
    "/api/admin/demo-data",
    response_model=DemoDataDeletedResponse,
)
def delete_demo_data(
    _: AdminAccess,
    db: DbSession,
) -> DemoDataDeletedResponse:
    demo_reviews = db.query(Ulasan).filter(Ulasan.sumber == "demo").all()
    deleted_count = len(demo_reviews)
    try:
        for review in demo_reviews:
            db.delete(review)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return DemoDataDeletedResponse(
        terhapus=deleted_count,
        message=f"{deleted_count} ulasan demo berhasil dihapus.",
    )


app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
