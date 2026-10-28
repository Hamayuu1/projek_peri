"""Menambahkan akun admin secara manual ke database.

  python buat_admin.py admin@email.com   -> minta sandi, lalu buat (atau jadikan) akun tersebut admin
  python buat_admin.py --hash            -> hanya mencetak hash sandi, untuk dimasukkan lewat SQL manual

Cara SQL manual (HeidiSQL / phpMyAdmin), memakai hash dari perintah --hash:
  INSERT INTO users (email, password_hash, role) VALUES ('admin@email.com', '<hash>', 'admin');
Untuk akun yang sudah register:
  UPDATE users SET role='admin' WHERE email='admin@email.com';
"""
import getpass
import sys

from werkzeug.security import generate_password_hash

import app as peri


def minta_sandi() -> str:
    sandi = getpass.getpass("Kata sandi (8-30 karakter): ")
    if not peri.SANDI_MIN <= len(sandi) <= peri.SANDI_MAKS:
        sys.exit(f"Kata sandi harus {peri.SANDI_MIN}-{peri.SANDI_MAKS} karakter.")
    if getpass.getpass("Ulangi kata sandi: ") != sandi:
        sys.exit("Kata sandi tidak sama.")
    return sandi


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    if sys.argv[1] == "--hash":
        print(generate_password_hash(minta_sandi()))
        return

    email = peri.bersihkan_email(sys.argv[1])
    if not email:
        sys.exit("Email tidak valid.")
    peri.siapkan_database()
    sandi = minta_sandi()

    koneksi = peri.sambung()
    try:
        with koneksi.cursor() as cur:
            cur.execute(
                "INSERT INTO users (email, password_hash, role) VALUES (%s,%s,'admin') "
                "ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role='admin'",
                (email, generate_password_hash(sandi)),
            )
    finally:
        koneksi.close()
    print(f"Akun admin siap: {email}")


if __name__ == "__main__":
    main()