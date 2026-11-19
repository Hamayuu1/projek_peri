"""API autentikasi PERI (Flask + MySQL).

Cara menjalankan (Windows + Laragon):
  1. Laragon -> Start All (MySQL harus hidup).
  2. Dari folder ini:
         pip install -r requirements.txt
         python app.py            -> http://127.0.0.1:5001
     Database 'peri' dan tabelnya dibuat otomatis (lihat schema.sql).
  3. Buat akun admin secara manual:  python buat_admin.py admin@email.com

Aturan peran:
  - Register lewat web lembaga -> role 'pendaftar' (otomatis, tidak bisa memilih).
  - Role 'admin' hanya bisa ditambahkan lewat database (buat_admin.py atau SQL).
  - Pendaftar hanya boleh memakai web lembaga; endpoint admin menolaknya (403).
  - Pendaftaran program (POST /api/pendaftaran-program) wajib sudah masuk; satu akun satu kali per program.
  - Umpan balik (POST /api/buku-tamu) wajib sudah masuk; email diambil dari akun, akun admin ditolak.
  - Katalog program: GET /api/program (publik); tambah/ubah/hapus/foto hanya admin. Foto disimpan di folder uploads/.

Pengaturan koneksi ada di file .env (salin dari .env.example).
"""
import hashlib
import hmac
import json
import os
import re
import secrets
import smtplib
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from functools import wraps
from pathlib import Path

import pymysql
from dotenv import load_dotenv
from flask import Flask, g, jsonify, request, send_from_directory, session
from pymysql.cursors import DictCursor
from werkzeug.security import check_password_hash, generate_password_hash

BASE = Path(__file__).resolve().parent
load_dotenv(BASE / ".env")

DB_HOST = os.environ.get("PERI_DB_HOST", "127.0.0.1")
DB_PORT = int(os.environ.get("PERI_DB_PORT", "3306"))
DB_USER = os.environ.get("PERI_DB_USER", "root")
DB_PASS = os.environ.get("PERI_DB_PASS", "")
DB_NAME = os.environ.get("PERI_DB_NAME", "peri")

NLP_URL = os.environ.get("PERI_NLP_URL", "http://127.0.0.1:5000/api/kategori")

SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587") or 587)
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "") or SMTP_USER

KODE_BERLAKU = timedelta(minutes=10)
KODE_JEDA = 60              # detik antar permintaan kode untuk satu email
KODE_MAKS_SALAH = 5
SANDI_MIN, SANDI_MAKS = 8, 30
LOGIN_MAKS_GAGAL, LOGIN_KUNCI = 5, 5 * 60   # 5 kali gagal -> tunggu 5 menit
KIRIM_MAKS_PER_IP, KIRIM_JENDELA = 10, 10 * 60
UMPAN_MAKS_PER_IP, UMPAN_JENDELA = 5, 10 * 60   # 5 umpan balik per 10 menit per IP
DAFTAR_MAKS_PER_USER, DAFTAR_JENDELA = 10, 10 * 60   # 10 percobaan daftar program per 10 menit per akun

FOTO_MAKS = 2 * 1024 * 1024
FOTO_DIR = BASE / "uploads" / "program"
KATEGORI_PROGRAM = {"pelatihan", "bisnis", "kesehatan", "komunitas"}
PERIODE_PROGRAM = {"Mingguan", "Bulanan", "Triwulanan", "Semesteran", "Tahunan"}
# Isi awal tabel program (sama dengan katalog yang tampil di web lembaga). Hanya dipakai saat tabel masih kosong.
PROGRAM_AWAL = [
    ("Bangkit dan Berdaya", "kesehatan", "Menggabungkan pemulihan trauma, pengembangan diri, dan peningkatan harapan.", "Mingguan", 0),
    ("Inkubator Bisnis Perempuan", "bisnis", "Mentoring dan pendampingan bisnis mikro untuk anggota komunitas.", "Tahunan", 0),
    ("Kelas Kreasi Mandiri", "bisnis", "Sistem simpan pinjam berbasis komunitas untuk mendukung usaha kecil anggota.", "Bulanan", 0),
    ("Digital Skill Academy", "pelatihan", "Pelatihan digital marketing, desain grafis, dan content creation untuk perempuan.", "Triwulanan", 0),
    ("Ruang Temu & Kolaborasi", "komunitas", "Sesi diskusi, sharing, dan networking antaranggota dan komunitas lain.", "Bulanan", 0),
    ("Perempuan Sehat & Bahagia", "kesehatan", "Program edukasi kesehatan, parenting, mental health, dan kesehatan reproduksi.", "Semesteran", 0),
    ("Beasiswa Kreatifitas Anak Perempuan", "pelatihan", "Bantuan pendidikan dan pelatihan untuk anak perempuan dari keluarga tidak mampu.", "Tahunan", 0),
    ("Podcast Suara Perempuan", "komunitas", "Platform berbagi cerita inspiratif, edukatif, dan aspiratif untuk perempuan.", "Mingguan", 0),
    ("Festival Perempuan Kreatif", "komunitas", "Event pameran, talkshow, dan workshop terbuka untuk masyarakat umum.", "Tahunan", 1),
    ("Gerakan Sosial & Lingkungan", "komunitas", "Aksi sosial, daur ulang, dan kegiatan lingkungan berbasis komunitas.", "Bulanan", 1),
]

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
WA_RE = re.compile(r"^08\d{8,12}$")   # nomor WhatsApp Indonesia setelah dinormalkan
ORIGIN_RE = re.compile(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$")
ORIGIN_TAMBAHAN = {o.strip() for o in os.environ.get("PERI_ORIGINS", "").split(",") if o.strip()}

# Dipakai agar waktu respons login sama baik email ada maupun tidak.
HASH_PALSU = generate_password_hash("bukan-sandi-sungguhan")


def _kunci_rahasia() -> bytes:
    dari_env = os.environ.get("PERI_SECRET_KEY")
    if dari_env:
        return dari_env.encode()
    berkas = BASE / "secret.key"
    if not berkas.exists():
        berkas.write_text(secrets.token_hex(32))
    return berkas.read_text().strip().encode()


SECRET = _kunci_rahasia()

app = Flask(__name__)
app.secret_key = SECRET
app.config.update(
    SESSION_COOKIE_NAME="peri_session",
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("PERI_HTTPS") == "1",
    PERMANENT_SESSION_LIFETIME=timedelta(days=7),
    JSON_AS_ASCII=False,
    MAX_CONTENT_LENGTH=3 * 1024 * 1024,   # batas ukuran seluruh permintaan (foto maks 2 MB)
)


# ------------------------------------------------------------------ database
def sambung(dengan_db: bool = True):
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME if dengan_db else None,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=True,
    )


def db():
    if "db" not in g:
        g.db = sambung()
    return g.db


@app.teardown_appcontext
def _tutup_db(_exc):
    koneksi = g.pop("db", None)
    if koneksi is not None:
        koneksi.close()


def siapkan_database():
    """Buat database dan tabel bila belum ada."""
    koneksi = sambung(dengan_db=False)
    try:
        with koneksi.cursor() as cur:
            cur.execute(
                f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
            cur.execute(f"USE `{DB_NAME}`")
            teks = "\n".join(
                b for b in (BASE / "schema.sql").read_text(encoding="utf-8").splitlines()
                if not b.strip().startswith("--")
            )
            for perintah in (p.strip() for p in teks.split(";")):
                if perintah and not perintah.upper().startswith(("CREATE DATABASE", "USE ")):
                    cur.execute(perintah)

            # Pastikan tabelnya benar-benar ada, dan tampilkan di terminal.
            cur.execute("SHOW TABLES")
            ada = {str(list(b.values())[0]).lower() for b in cur.fetchall()}
            hilang = {"users", "kode_verifikasi", "buku_tamu", "pendaftaran_program", "program"} - ada
            if hilang:
                raise RuntimeError(
                    f"Tabel {', '.join(sorted(hilang))} gagal dibuat di database '{DB_NAME}'. "
                    "Impor schema.sql lewat phpMyAdmin (tab Import)."
                )

            cur.execute("SELECT COUNT(*) AS n FROM program")
            if cur.fetchone()["n"] == 0:
                for urut, (nama, kat, desk, per, lebih) in enumerate(PROGRAM_AWAL, start=1):
                    cur.execute(
                        "INSERT INTO program (nama, kategori, deskripsi, periode, lebih, urutan) "
                        "VALUES (%s,%s,%s,%s,%s,%s)",
                        (nama, kat, desk, per, lebih, urut),
                    )
                print(f"Katalog program diisi {len(PROGRAM_AWAL)} program awal.", flush=True)
            print(f"Tabel siap di database '{DB_NAME}': {', '.join(sorted(ada))}", flush=True)
    finally:
        koneksi.close()


def sekarang() -> datetime:
    """Waktu UTC tanpa zona (disimpan apa adanya di MySQL)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ------------------------------------------------------------------ pembatasan
_catatan: dict = {}


def _sisa_tunggu(kunci, maks, jendela) -> int:
    now = time.time()
    daftar = [t for t in _catatan.get(kunci, []) if now - t < jendela]
    _catatan[kunci] = daftar
    if len(daftar) >= maks:
        return int(jendela - (now - daftar[0])) + 1
    return 0


def _catat(kunci):
    _catatan.setdefault(kunci, []).append(time.time())


# ------------------------------------------------------------------ util
def galat(pesan: str, status: int = 400):
    return jsonify({"error": pesan}), status


def data_json() -> dict:
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def bersihkan_email(nilai) -> str:
    email = str(nilai or "").strip().lower()
    return email if len(email) <= 190 and EMAIL_RE.match(email) else ""


def bersihkan_wa(nilai) -> str:
    """Normalkan nomor WhatsApp ke format 08xxxxxxxxxx. String kosong bila tidak valid."""
    nomor = re.sub(r"[\s\-().]", "", str(nilai or ""))
    if nomor.startswith("+62"):
        nomor = "0" + nomor[3:]
    elif nomor.startswith("62"):
        nomor = "0" + nomor[2:]
    return nomor if WA_RE.match(nomor) else ""


def user_publik(baris: dict) -> dict:
    return {"id": baris["id"], "email": baris["email"], "role": baris["role"]}


def hash_kode(email: str, kode: str) -> str:
    return hmac.new(SECRET, f"{email}:{kode}".encode(), hashlib.sha256).hexdigest()


def kirim_kode_email(email: str, kode: str) -> str:
    """Kirim kode lewat SMTP. Tanpa SMTP, cetak di terminal (mode pengembangan)."""
    if not SMTP_HOST:
        print(f"\n[MODE PENGEMBANGAN] Kode verifikasi untuk {email}: {kode}\n", flush=True)
        return "terminal"
    pesan = EmailMessage()
    pesan["Subject"] = "Kode verifikasi PERI"
    pesan["From"] = SMTP_FROM
    pesan["To"] = email
    pesan.set_content(
        f"Kode verifikasi pendaftaran akun PERI Anda: {kode}\n"
        "Kode berlaku 10 menit. Abaikan email ini jika Anda tidak merasa mendaftar."
    )
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
        smtp.starttls()
        if SMTP_USER:
            smtp.login(SMTP_USER, SMTP_PASS)
        smtp.send_message(pesan)
    return "email"


def masuk_sesi(user: dict):
    session.clear()
    session.permanent = True
    session["uid"] = user["id"]


def user_saat_ini():
    """Pengguna dari sesi. Role selalu dibaca ulang dari database."""
    uid = session.get("uid")
    if not uid:
        return None
    with db().cursor() as cur:
        cur.execute("SELECT id, email, role FROM users WHERE id=%s", (uid,))
        return cur.fetchone()


def peran_wajib(*peran):
    """Dekorator untuk endpoint yang hanya boleh diakses peran tertentu."""
    def pembungkus(fn):
        @wraps(fn)
        def dalam(*a, **kw):
            user = user_saat_ini()
            if not user:
                return galat("Belum masuk.", 401)
            if user["role"] not in peran:
                return galat("Akses ditolak.", 403)
            g.user = user
            return fn(*a, **kw)
        return dalam
    return pembungkus


# ------------------------------------------------------------------ CORS & keamanan
def origin_diizinkan(origin: str) -> bool:
    return bool(origin) and (bool(ORIGIN_RE.match(origin)) or origin in ORIGIN_TAMBAHAN)


@app.before_request
def _periksa_origin():
    origin = request.headers.get("Origin", "")
    if request.method == "OPTIONS":
        return "", 204
    if request.method != "GET" and origin and not origin_diizinkan(origin):
        return galat("Asal permintaan tidak diizinkan.", 403)


@app.after_request
def _cors(resp):
    origin = request.headers.get("Origin", "")
    if origin_diizinkan(origin):
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        resp.headers["Vary"] = "Origin"
    resp.headers.setdefault("Cache-Control", "no-store")
    return resp


@app.errorhandler(404)
def _404(_e):
    return galat("Endpoint tidak ditemukan.", 404)


@app.errorhandler(413)
def _413(_e):
    return galat("Ukuran berkas terlalu besar (foto maksimal 2 MB).", 413)


@app.errorhandler(405)
def _405(_e):
    return galat("Metode tidak diizinkan.", 405)


@app.errorhandler(pymysql.err.OperationalError)
def _db_mati(e):
    print(f"[GALAT DATABASE] {e}", file=sys.stderr, flush=True)
    return galat("Database tidak dapat dihubungi. Pastikan MySQL di Laragon sudah Start.", 503)


@app.errorhandler(Exception)
def _galat_lain(e):
    from werkzeug.exceptions import HTTPException
    if isinstance(e, HTTPException):
        return galat(e.description, e.code)
    print(f"[GALAT] {e!r}", file=sys.stderr, flush=True)
    return galat("Terjadi kesalahan di server.", 500)


# ------------------------------------------------------------------ endpoint
@app.post("/api/auth/kirim-kode")
def kirim_kode():
    email = bersihkan_email(data_json().get("email"))
    if not email:
        return galat("Masukkan email yang valid.")

    ip = request.remote_addr or "?"
    if _sisa_tunggu(("kode-ip", ip), KIRIM_MAKS_PER_IP, KIRIM_JENDELA):
        return galat("Terlalu banyak permintaan kode. Coba lagi beberapa menit lagi.", 429)

    with db().cursor() as cur:
        cur.execute("SELECT 1 FROM users WHERE email=%s", (email,))
        if cur.fetchone():
            return galat("Email sudah terdaftar. Silakan masuk.", 409)

        cur.execute("SELECT dikirim_pada FROM kode_verifikasi WHERE email=%s", (email,))
        lama = cur.fetchone()
        if lama:
            lewat = (sekarang() - lama["dikirim_pada"]).total_seconds()
            if lewat < KODE_JEDA:
                return galat(f"Tunggu {int(KODE_JEDA - lewat) + 1} detik sebelum meminta kode lagi.", 429)

        kode = f"{secrets.randbelow(10 ** 6):06d}"
        now = sekarang()
        cur.execute(
            "REPLACE INTO kode_verifikasi (email, kode_hash, kadaluarsa, percobaan, dikirim_pada) "
            "VALUES (%s,%s,%s,0,%s)",
            (email, hash_kode(email, kode), now + KODE_BERLAKU, now),
        )

    _catat(("kode-ip", ip))
    try:
        cara = kirim_kode_email(email, kode)
    except Exception as e:  # SMTP gagal
        print(f"[GALAT EMAIL] {e!r}", file=sys.stderr, flush=True)
        with db().cursor() as cur:
            cur.execute("DELETE FROM kode_verifikasi WHERE email=%s", (email,))
        return galat("Gagal mengirim email verifikasi. Coba lagi nanti.", 502)

    if cara == "terminal":
        return jsonify({"pesan": "Mode pengembangan: kode verifikasi ditampilkan di terminal server."})
    return jsonify({"pesan": "Kode verifikasi dikirim ke email Anda."})


@app.post("/api/auth/register")
def register():
    data = data_json()
    email = bersihkan_email(data.get("email"))
    kode = str(data.get("kode") or "").strip()
    sandi = data.get("password")

    if not email:
        return galat("Masukkan email yang valid.")
    if not isinstance(sandi, str) or not SANDI_MIN <= len(sandi) <= SANDI_MAKS:
        return galat(f"Kata sandi {SANDI_MIN}–{SANDI_MAKS} karakter.")
    if not kode:
        return galat("Masukkan kode verifikasi.")

    with db().cursor() as cur:
        cur.execute("SELECT * FROM kode_verifikasi WHERE email=%s", (email,))
        baris = cur.fetchone()
        if not baris or baris["kadaluarsa"] < sekarang():
            return galat("Kode verifikasi tidak ada atau sudah kedaluwarsa. Kirim ulang kode.")
        if baris["percobaan"] >= KODE_MAKS_SALAH:
            cur.execute("DELETE FROM kode_verifikasi WHERE email=%s", (email,))
            return galat("Terlalu banyak kode salah. Kirim ulang kode baru.", 429)
        if not hmac.compare_digest(baris["kode_hash"], hash_kode(email, kode)):
            cur.execute("UPDATE kode_verifikasi SET percobaan=percobaan+1 WHERE email=%s", (email,))
            return galat("Kode verifikasi salah.")

        # Role SELALU 'pendaftar' dari sini. Isi body 'role' sengaja diabaikan.
        try:
            cur.execute(
                "INSERT INTO users (email, password_hash, role) VALUES (%s,%s,'pendaftar')",
                (email, generate_password_hash(sandi)),
            )
        except pymysql.err.IntegrityError:
            return galat("Email sudah terdaftar. Silakan masuk.", 409)
        uid = cur.lastrowid
        cur.execute("DELETE FROM kode_verifikasi WHERE email=%s", (email,))

    user = {"id": uid, "email": email, "role": "pendaftar"}
    masuk_sesi(user)
    return jsonify({"user": user}), 201


def _proses_login(khusus_admin: bool):
    """Login bersama. Pintu publik menolak akun admin, pintu admin menolak selain admin.
    Pesan galat dibuat sama agar tidak membocorkan jenis akun."""
    data = data_json()
    email = bersihkan_email(data.get("email"))
    sandi = data.get("password")
    if not email or not isinstance(sandi, str) or not sandi:
        return galat("Email atau kata sandi salah.", 401)

    pintu = "admin" if khusus_admin else "publik"
    kunci = (f"login-{pintu}", request.remote_addr or "?", email)
    tunggu = _sisa_tunggu(kunci, LOGIN_MAKS_GAGAL, LOGIN_KUNCI)
    if tunggu:
        return galat(f"Terlalu banyak percobaan gagal. Coba lagi dalam {tunggu // 60 + 1} menit.", 429)

    with db().cursor() as cur:
        cur.execute("SELECT id, email, role, password_hash FROM users WHERE email=%s", (email,))
        baris = cur.fetchone()
        cocok = check_password_hash(baris["password_hash"] if baris else HASH_PALSU, sandi)
        peran_sesuai = bool(baris) and ((baris["role"] == "admin") == khusus_admin)
        if not baris or not cocok or not peran_sesuai:
            _catat(kunci)
            return galat("Email atau kata sandi salah.", 401)
        cur.execute("UPDATE users SET last_login=%s WHERE id=%s", (sekarang(), baris["id"]))

    _catatan.pop(kunci, None)
    user = user_publik(baris)
    masuk_sesi(user)
    return jsonify({"user": user})


@app.post("/api/auth/login")
def login():
    """Pintu login web lembaga (publik). Akun admin tidak bisa masuk lewat sini."""
    return _proses_login(khusus_admin=False)


@app.post("/api/admin/login")
def login_admin():
    """Pintu login khusus panel admin. Hanya akun ber-role 'admin' yang diterima."""
    return _proses_login(khusus_admin=True)


@app.post("/api/auth/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.get("/api/auth/me")
def saya():
    user = user_saat_ini()
    if not user or user["role"] == "admin":   # sesi admin tidak dikenali web publik
        return galat("Belum masuk.", 401)
    return jsonify({"user": user_publik(user)})


@app.get("/api/admin/cek")
@peran_wajib("admin")
def cek_admin():
    """Dipakai penjaga halaman web admin. Endpoint admin lain memakai dekorator yang sama."""
    return jsonify({"user": user_publik(g.user)})


# ------------------------------------------------------------------ umpan balik (buku tamu)
def tentukan_kategori(pesan: str):
    """Minta kategori ke API NLP (peri-nlp, python api.py). Gagal -> (None, None); pesan tetap disimpan."""
    try:
        req = urllib.request.Request(
            NLP_URL,
            data=json.dumps({"pesan": [pesan]}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            hasil = json.load(resp)["hasil"][0]
        return str(hasil["kategori"]), float(hasil["skor"])
    except Exception as e:
        print(f"[NLP] Kategori tidak dapat ditentukan (jalankan peri-nlp/api.py): {e!r}", flush=True)
        return None, None


@app.post("/api/buku-tamu")
def kirim_umpan_balik():
    """Dipakai form umpan balik web lembaga (harus sudah masuk).
    Email diambil dari akun yang sedang masuk, bukan dari isian formulir, supaya tidak bisa dipalsukan.
    Kategori ditentukan otomatis oleh model NLP."""
    user = user_saat_ini()
    if not user:
        return galat("Silakan masuk terlebih dahulu untuk mengirim umpan balik.", 401)
    if user["role"] == "admin":
        return galat("Akun admin tidak dapat mengirim umpan balik.", 403)

    d = data_json()
    nama = str(d.get("nama") or "").strip()
    email = user["email"]
    pesan = str(d.get("pesan") or "").strip()
    if not nama or len(nama) > 100:
        return galat("Nama wajib diisi (maksimal 100 karakter).")
    if not 5 <= len(pesan) <= 2000:
        return galat("Pesan harus 5–2000 karakter.")

    kunci = ("umpan", request.remote_addr or "?")
    if _sisa_tunggu(kunci, UMPAN_MAKS_PER_IP, UMPAN_JENDELA):
        return galat("Terlalu banyak pesan dikirim. Coba lagi beberapa menit lagi.", 429)
    _catat(kunci)

    kategori, skor = tentukan_kategori(pesan)
    with db().cursor() as cur:
        cur.execute(
            "INSERT INTO buku_tamu (nama, email, pesan, kategori, skor) VALUES (%s,%s,%s,%s,%s)",
            (nama, email, pesan, kategori, skor),
        )
    return jsonify({"ok": True}), 201


@app.post("/api/pendaftaran-program")
def daftar_program():
    """Pendaftaran program dari pop-up 'Daftar Program' (harus sudah masuk).
    Satu akun hanya boleh mendaftar satu kali pada program yang sama (409 bila ganda)."""
    user = user_saat_ini()
    if not user:
        return galat("Silakan masuk terlebih dahulu untuk mendaftar program.", 401)

    d = data_json()
    program = str(d.get("program") or "").strip()
    nama = str(d.get("nama") or "").strip()
    email = bersihkan_email(d.get("email"))
    wa = bersihkan_wa(d.get("wa"))

    def tolak(pesan, kolom):
        return jsonify({"error": pesan, "kolom": kolom}), 400

    if not nama or len(nama) > 100:
        return tolak("Nama lengkap wajib diisi (maksimal 100 karakter).", "nama")
    if not email:
        return tolak("Masukkan email yang valid.", "email")
    if not wa:
        return tolak("Nomor WhatsApp tidak valid. Gunakan angka, contoh 081234567890.", "wa")
    if not program or len(program) > 150:
        return tolak("Pilih program yang ingin diikuti.", "program")
    if d.get("setuju") is not True:
        return tolak("Centang persetujuan penggunaan data untuk melanjutkan.", "setuju")

    kunci = ("daftar", user["id"])
    if _sisa_tunggu(kunci, DAFTAR_MAKS_PER_USER, DAFTAR_JENDELA):
        return galat("Terlalu banyak percobaan pendaftaran. Coba lagi beberapa menit lagi.", 429)
    _catat(kunci)

    with db().cursor() as cur:
        cur.execute(
            "SELECT nama, email, wa, program FROM pendaftaran_program WHERE user_id=%s AND program=%s",
            (user["id"], program),
        )
        ada = cur.fetchone()
        if ada:
            return jsonify({"error": "Anda sudah terdaftar pada program ini.",
                            "kode": "sudah_terdaftar", "data": ada}), 409
        try:
            cur.execute(
                "INSERT INTO pendaftaran_program (user_id, program, nama, email, wa) "
                "VALUES (%s,%s,%s,%s,%s)",
                (user["id"], program, nama, email, wa),
            )
        except pymysql.err.IntegrityError:
            # Dua permintaan bersamaan: kunci UNIQUE di database yang menjadi penentu.
            return jsonify({"error": "Anda sudah terdaftar pada program ini.",
                            "kode": "sudah_terdaftar",
                            "data": {"nama": nama, "email": email, "wa": wa, "program": program}}), 409
    return jsonify({"ok": True, "data": {"nama": nama, "email": email, "wa": wa, "program": program}}), 201


@app.get("/api/pendaftaran-program")
@peran_wajib("admin")
def daftar_pendaftar_program():
    """Daftar pendaftar program untuk panel admin (terbaru di atas)."""
    with db().cursor() as cur:
        cur.execute(
            "SELECT id, nama, email, wa, program, status, created_at "
            "FROM pendaftaran_program ORDER BY id DESC LIMIT 2000"
        )
        baris = cur.fetchall()
    return jsonify({"pendaftar": [
        {
            "id": b["id"], "nama": b["nama"], "email": b["email"], "wa": b["wa"],
            "program": b["program"], "status": b["status"],
            "tanggal": b["created_at"].strftime("%Y-%m-%d"),
        }
        for b in baris
    ]})


@app.post("/api/pendaftaran-program/<int:pid>/konfirmasi")
@peran_wajib("admin")
def konfirmasi_pendaftar_program(pid: int):
    """Admin menerima (diterima=true) atau membatalkan penerimaan (diterima=false) pendaftar."""
    nilai = data_json().get("diterima")
    if not isinstance(nilai, bool):
        return galat("Nilai 'diterima' harus true atau false.")
    status = "diterima" if nilai else "baru"
    with db().cursor() as cur:
        cur.execute("SELECT id FROM pendaftaran_program WHERE id=%s", (pid,))
        if not cur.fetchone():
            return galat("Pendaftar tidak ditemukan.", 404)
        cur.execute("UPDATE pendaftaran_program SET status=%s WHERE id=%s", (status, pid))
    return jsonify({"ok": True, "status": status})


@app.get("/api/buku-tamu")
@peran_wajib("admin")
def daftar_umpan_balik():
    with db().cursor() as cur:
        cur.execute(
            "SELECT id, nama, email, pesan, kategori, skor, dibaca, created_at "
            "FROM buku_tamu ORDER BY id DESC LIMIT 500"
        )
        baris = cur.fetchall()
    return jsonify({"pesan": [
        {
            "id": b["id"], "nama": b["nama"], "email": b["email"], "pesan": b["pesan"],
            "kategori": b["kategori"], "skor": b["skor"], "dibaca": bool(b["dibaca"]),
            "tanggal": b["created_at"].strftime("%Y-%m-%d"),
        }
        for b in baris
    ]})


@app.post("/api/buku-tamu/<int:pid>/dibaca")
@peran_wajib("admin")
def tandai_dibaca(pid: int):
    nilai = data_json().get("dibaca")
    if not isinstance(nilai, bool):
        return galat("Nilai 'dibaca' harus true atau false.")
    with db().cursor() as cur:
        cur.execute("UPDATE buku_tamu SET dibaca=%s WHERE id=%s", (1 if nilai else 0, pid))
    return jsonify({"ok": True})


# ------------------------------------------------------------------ katalog program
def program_publik(b: dict) -> dict:
    return {
        "id": b["id"], "nama": b["nama"], "kategori": b["kategori"],
        "deskripsi": b["deskripsi"], "periode": b["periode"],
        "gambar": f"/uploads/program/{b['gambar']}" if b["gambar"] else None,
        "lebih": bool(b["lebih"]),
    }


def ambil_program(pid: int):
    with db().cursor() as cur:
        cur.execute("SELECT * FROM program WHERE id=%s", (pid,))
        return cur.fetchone()


def periksa_isi_program(d: dict, baru: bool):
    """Kembalikan (nilai, None) bila sah, atau (None, pesan galat)."""
    nama = re.sub(r"\s+", " ", str(d.get("nama") or "")).strip()
    deskripsi = re.sub(r"\s+", " ", str(d.get("deskripsi") or "")).strip()
    kategori = str(d.get("kategori") or "").strip()
    periode = str(d.get("periode") or "").strip()
    if baru and (not nama or len(nama) > 150):
        return None, "Nama program wajib diisi (maksimal 150 karakter)."
    if not deskripsi or len(deskripsi) > 300:
        return None, "Tujuan/deskripsi wajib diisi (maksimal 300 karakter)."
    if kategori not in KATEGORI_PROGRAM:
        return None, "Pilih kategori program."
    if periode not in PERIODE_PROGRAM:
        return None, "Pilih periode program."
    return {"nama": nama, "deskripsi": deskripsi, "kategori": kategori,
            "periode": periode, "lebih": 1 if d.get("lebih") is True else 0}, None


def hapus_berkas_foto(nama_berkas):
    if nama_berkas:
        try:
            (FOTO_DIR / nama_berkas).unlink(missing_ok=True)
        except OSError:
            pass


@app.get("/api/program")
def daftar_program_publik():
    """Katalog program untuk web lembaga (tanpa login)."""
    with db().cursor() as cur:
        cur.execute("SELECT * FROM program ORDER BY urutan, id")
        return jsonify({"program": [program_publik(b) for b in cur.fetchall()]})


@app.post("/api/program")
@peran_wajib("admin")
def tambah_program():
    nilai, pesan = periksa_isi_program(data_json(), baru=True)
    if pesan:
        return galat(pesan)
    with db().cursor() as cur:
        cur.execute("SELECT 1 FROM program WHERE nama=%s", (nilai["nama"],))
        if cur.fetchone():
            return galat("Nama program sudah dipakai.", 409)
        cur.execute("SELECT COALESCE(MAX(urutan), 0) + 1 AS u FROM program")
        urutan = cur.fetchone()["u"]
        cur.execute(
            "INSERT INTO program (nama, kategori, deskripsi, periode, lebih, urutan) VALUES (%s,%s,%s,%s,%s,%s)",
            (nilai["nama"], nilai["kategori"], nilai["deskripsi"], nilai["periode"], nilai["lebih"], urutan),
        )
        pid = cur.lastrowid
    return jsonify({"program": program_publik(ambil_program(pid))}), 201


@app.put("/api/program/<int:pid>")
@peran_wajib("admin")
def ubah_program(pid: int):
    lama = ambil_program(pid)
    if not lama:
        return galat("Program tidak ditemukan.", 404)
    d = data_json()
    # Pendaftaran dicocokkan lewat nama, jadi nama dikunci setelah program dibuat.
    if "nama" in d and str(d["nama"]).strip() != lama["nama"]:
        return galat("Nama program tidak dapat diubah karena dipakai pada data pendaftaran.")
    nilai, pesan = periksa_isi_program(d, baru=False)
    if pesan:
        return galat(pesan)
    with db().cursor() as cur:
        cur.execute(
            "UPDATE program SET kategori=%s, deskripsi=%s, periode=%s, lebih=%s WHERE id=%s",
            (nilai["kategori"], nilai["deskripsi"], nilai["periode"], nilai["lebih"], pid),
        )
    return jsonify({"program": program_publik(ambil_program(pid))})


@app.delete("/api/program/<int:pid>")
@peran_wajib("admin")
def hapus_program(pid: int):
    lama = ambil_program(pid)
    if not lama:
        return galat("Program tidak ditemukan.", 404)
    with db().cursor() as cur:
        cur.execute("DELETE FROM program WHERE id=%s", (pid,))
    hapus_berkas_foto(lama["gambar"])
    return jsonify({"ok": True})


def jenis_gambar(isi: bytes) -> str:
    """Kenali jenis gambar dari isi berkas (bukan dari nama/ekstensi). Kosong bila bukan gambar yang diizinkan."""
    if isi.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if isi.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if isi[:4] == b"RIFF" and isi[8:12] == b"WEBP":
        return ".webp"
    return ""


@app.post("/api/program/<int:pid>/foto")
@peran_wajib("admin")
def unggah_foto_program(pid: int):
    lama = ambil_program(pid)
    if not lama:
        return galat("Program tidak ditemukan.", 404)
    berkas = request.files.get("foto")
    if not berkas:
        return galat("Pilih file foto terlebih dahulu.")
    isi = berkas.read(FOTO_MAKS + 1)
    if len(isi) > FOTO_MAKS:
        return galat("Ukuran foto maksimal 2 MB.", 413)
    ekstensi = jenis_gambar(isi)
    if not ekstensi:
        return galat("Format foto harus JPG, PNG, atau WebP.", 415)
    FOTO_DIR.mkdir(parents=True, exist_ok=True)
    nama_baru = f"{secrets.token_hex(8)}{ekstensi}"
    (FOTO_DIR / nama_baru).write_bytes(isi)
    with db().cursor() as cur:
        cur.execute("UPDATE program SET gambar=%s WHERE id=%s", (nama_baru, pid))
    hapus_berkas_foto(lama["gambar"])
    return jsonify({"program": program_publik(ambil_program(pid))})


@app.delete("/api/program/<int:pid>/foto")
@peran_wajib("admin")
def hapus_foto_program(pid: int):
    lama = ambil_program(pid)
    if not lama:
        return galat("Program tidak ditemukan.", 404)
    with db().cursor() as cur:
        cur.execute("UPDATE program SET gambar=NULL WHERE id=%s", (pid,))
    hapus_berkas_foto(lama["gambar"])
    return jsonify({"program": program_publik(ambil_program(pid))})


@app.get("/uploads/program/<path:nama_berkas>")
def sajikan_foto_program(nama_berkas: str):
    """Foto program (publik). send_from_directory menolak jalur keluar folder."""
    resp = send_from_directory(FOTO_DIR, nama_berkas)
    resp.headers["Cache-Control"] = "public, max-age=86400"
    resp.headers["X-Content-Type-Options"] = "nosniff"
    return resp


if __name__ == "__main__":
    try:
        siapkan_database()
    except pymysql.err.OperationalError as e:
        sys.exit(
            f"Tidak bisa terhubung ke MySQL ({DB_HOST}:{DB_PORT}): {e}\n"
            "Buka Laragon lalu klik Start All, dan cek pengaturan di file .env."
        )
    print(f"API autentikasi PERI aktif di http://127.0.0.1:5001  (database: {DB_NAME})")
    app.run(host="127.0.0.1", port=5001, debug=False)