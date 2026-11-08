import csv
import io
import json

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from backend import main
from backend.database import Ulasan


def _review_payload() -> dict[str, object]:
    return {
        "program_id": 1,
        "nama_peserta": "Peserta Tes",
        "komentar": "Pendamping sangat ramah dan materi bermanfaat.",
        "aspek_terkait": "pengajar",
        "fasilitas": 4,
        "pengajar": 5,
        "materi": 4,
        "pelaksanaan": 4,
        "pelayanan": 5,
        "manfaat": 5,
    }


def test_post_ulasan_persists_all_model_predictions(
    api_client: TestClient,
    test_database: sessionmaker,
) -> None:
    response = api_client.post("/api/ulasan", json=_review_payload())

    assert response.status_code == 201
    result = response.json()
    assert result["pred_nb"] in {"positif", "negatif"}
    assert result["pred_svm"] in {"positif", "negatif"}
    assert result["pred_ensemble"] in {"positif", "negatif"}

    with test_database() as db:
        saved = db.get(Ulasan, result["id"])
        assert saved is not None
        assert saved.pred_nb == result["pred_nb"]
        assert saved.pred_svm == result["pred_svm"]
        assert saved.pred_ensemble == result["pred_ensemble"]
        assert json.loads(saved.proba_nb)
        assert json.loads(saved.proba_svm)
        assert json.loads(saved.proba_ensemble)


def test_csv_import_rejects_out_of_range_rating(
    api_client: TestClient,
    monkeypatch,
) -> None:
    monkeypatch.setattr(main, "ADMIN_TOKEN", "test-token")
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(
        [
            "komentar",
            "label",
            "program",
            "fasilitas",
            "pengajar",
            "materi",
            "pelaksanaan",
            "pelayanan",
            "manfaat",
            "aspek_terkait",
        ]
    )
    writer.writerow(
        [
            "Program sangat bagus dan bermanfaat",
            "positif",
            "Program CSV",
            6,
            4,
            4,
            4,
            4,
            5,
            "manfaat",
        ]
    )
    writer.writerow(
        [
            "Pendamping ramah dan materi jelas",
            "positif",
            "Program CSV",
            4,
            5,
            4,
            4,
            4,
            5,
            "pengajar",
        ]
    )

    response = api_client.post(
        "/api/admin/import",
        headers={"X-Admin-Token": "test-token"},
        files={"file": ("evaluasi.csv", output.getvalue().encode("utf-8"), "text/csv")},
    )

    assert response.status_code == 200
    report = response.json()
    assert report["jumlah_baris"] == 2
    assert report["masuk"] == 1
    assert report["ditolak"] == 1
    assert report["penolakan"][0]["baris"] == 2
    assert "rating fasilitas" in report["penolakan"][0]["alasan"]


def test_metrics_returns_404_when_artifact_is_missing(
    api_client: TestClient,
    tmp_path,
    monkeypatch,
) -> None:
    monkeypatch.setattr(main, "METRICS_PATH", tmp_path / "missing-metrics.json")

    response = api_client.get("/api/metrics")

    assert response.status_code == 404
    assert "belum tersedia" in response.json()["detail"]
