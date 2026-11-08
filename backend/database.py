import json
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, create_engine, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker
from sqlalchemy.engine import URL

from backend.config import DATABASE_PATH, PROGRAMS_PATH

DATABASE_URL = URL.create("sqlite", database=str(DATABASE_PATH))

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


class Program(Base):
    __tablename__ = "program"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nama: Mapped[str] = mapped_column(String(150), nullable=False)
    deskripsi: Mapped[str] = mapped_column(Text, nullable=False)
    ulasan: Mapped[list["Ulasan"]] = relationship(
        back_populates="program",
        cascade="all, delete-orphan",
    )


class Ulasan(Base):
    __tablename__ = "ulasan"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    program_id: Mapped[int] = mapped_column(
        ForeignKey("program.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nama_peserta: Mapped[str] = mapped_column(String(150), nullable=False)
    komentar_raw: Mapped[str] = mapped_column(Text, nullable=False)
    komentar_bersih: Mapped[str] = mapped_column(Text, nullable=False)
    prediksi_sentimen: Mapped[str] = mapped_column(String(50), nullable=False)
    aspek_terkait: Mapped[str] = mapped_column(String(100), nullable=False)
    tanggal: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.now,
        nullable=False,
        index=True,
    )
    pred_nb: Mapped[str] = mapped_column(String(50), nullable=False)
    pred_svm: Mapped[str] = mapped_column(String(50), nullable=False)
    pred_ensemble: Mapped[str] = mapped_column(String(50), nullable=False)
    proba_nb: Mapped[str] = mapped_column(Text, nullable=False)
    proba_svm: Mapped[str] = mapped_column(Text, nullable=False)
    proba_ensemble: Mapped[str] = mapped_column(Text, nullable=False)
    label_manual: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sumber: Mapped[str] = mapped_column(String(20), default="form", nullable=False)
    program: Mapped[Program] = relationship(back_populates="ulasan")
    rating: Mapped["RatingAspek"] = relationship(
        back_populates="ulasan",
        cascade="all, delete-orphan",
        uselist=False,
    )


class RatingAspek(Base):
    __tablename__ = "rating_aspek"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ulasan_id: Mapped[int] = mapped_column(
        ForeignKey("ulasan.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    fasilitas: Mapped[int] = mapped_column(Integer, nullable=False)
    pengajar: Mapped[int] = mapped_column(Integer, nullable=False)
    materi: Mapped[int] = mapped_column(Integer, nullable=False)
    pelaksanaan: Mapped[int] = mapped_column(Integer, nullable=False)
    pelayanan: Mapped[int] = mapped_column(Integer, nullable=False)
    manfaat: Mapped[int] = mapped_column(Integer, nullable=False)
    ulasan: Mapped[Ulasan] = relationship(back_populates="rating")


def init_db() -> None:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.query(func.count(Program.id)).scalar() == 0:
            program_data = json.loads(PROGRAMS_PATH.read_text(encoding="utf-8"))
            if not isinstance(program_data, list):
                raise ValueError(f"Format data program tidak valid: {PROGRAMS_PATH}")
            if any(
                not isinstance(program, dict)
                or not isinstance(program.get("nama"), str)
                or not isinstance(program.get("deskripsi"), str)
                for program in program_data
            ):
                raise ValueError(
                    f"Setiap program harus memiliki nama dan deskripsi: {PROGRAMS_PATH}"
                )
            db.add_all(
                Program(nama=program["nama"], deskripsi=program["deskripsi"])
                for program in program_data
            )
            db.commit()
