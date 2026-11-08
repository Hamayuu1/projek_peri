from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend import main
from backend.database import Base, Program
from ml import explain
from ml.preprocessing import preprocess_text
from ml.train import build_models


@pytest.fixture
def trained_models(monkeypatch: pytest.MonkeyPatch) -> dict[str, object]:
    samples = [
        ("pelatihan sangat bagus dan bermanfaat", "positif"),
        ("pendamping ramah program baik", "positif"),
        ("materi jelas dan mudah dipahami", "positif"),
        ("program kurang baik dan tidak bermanfaat", "negatif"),
        ("pendamping tidak ramah", "negatif"),
        ("materi sulit dan kurang jelas", "negatif"),
    ]
    texts = [preprocess_text(text) for text, _ in samples]
    labels = [label for _, label in samples]
    models = build_models()
    for model in models.values():
        model.fit(texts, labels)
    monkeypatch.setattr(explain, "_loaded_models", models)
    return models


@pytest.fixture
def test_database(tmp_path) -> Iterator[sessionmaker]:
    database_path = tmp_path / "test.sqlite"
    engine = create_engine(
        f"sqlite:///{database_path}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    with factory() as db:
        db.add(
            Program(
                nama="Program Uji",
                deskripsi="Program sementara untuk tes endpoint.",
            )
        )
        db.commit()
    yield factory
    engine.dispose()


@pytest.fixture
def api_client(
    test_database: sessionmaker,
    trained_models: dict[str, object],
) -> Iterator[TestClient]:
    def override_get_db():
        with test_database() as db:
            yield db

    main.app.dependency_overrides[main.get_db] = override_get_db
    client = TestClient(main.app)
    try:
        yield client
    finally:
        client.close()
        main.app.dependency_overrides.pop(main.get_db, None)
