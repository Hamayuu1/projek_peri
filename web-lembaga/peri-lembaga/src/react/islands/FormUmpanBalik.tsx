import { useEffect, useRef, useState, type FormEvent } from "react";
import { kirimBukuTamu } from "../../scripts/services/api";
import { Kolom } from "../components/Kolom";
import { Tombol } from "../components/Tombol";
import { useAuth } from "../hooks/useAuth";

// Formulir umpan balik: hanya untuk pengguna yang sudah masuk. Validasi di browser,
// lalu dikirim ke peri-backend dan tampil di menu Buku Tamu pada panel admin.
// Pengguna yang belum masuk diarahkan ke pop-up login; isian mereka tidak hilang.
const ERR_UMUM = "Terjadi kesalahan. Coba lagi.";
const PESAN_MASUK = "Silakan masuk terlebih dahulu untuk mengirim umpan balik.";

export default function FormUmpanBalik() {
  const { user, siap } = useAuth();
  const [sukses, setSukses] = useState(false);
  const [galat, setGalat] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const kotakSukses = useRef<HTMLDivElement>(null);

  // Gulir ke pesan sukses setelah tampil.
  useEffect(() => {
    if (sukses) kotakSukses.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [sukses]);

  const kirim = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const form = e.currentTarget;
    setSukses(false);
    setGalat("");
    if (!siap) return; // status login masih dicek
    if (!user) {
      setGalat(PESAN_MASUK);
      window.PERIAuth?.open("login");
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const nilai = (nama: string): string =>
      (form.elements.namedItem(nama) as HTMLInputElement | HTMLTextAreaElement).value.trim();

    setMengirim(true);
    const r = await kirimBukuTamu({ nama: nilai("nama"), email: nilai("email"), pesan: nilai("pesan") });
    if (r.ok) {
      form.reset();
      setSukses(true);
    } else if (r.status === 401) {
      // Sesi berakhir: minta masuk lagi tanpa menghapus isian.
      setGalat(PESAN_MASUK);
      window.PERIAuth?.open("login");
    } else if (r.status === 0) {
      setGalat("Server belum aktif. Pesan belum terkirim, coba lagi nanti.");
    } else {
      setGalat(r.error === ERR_UMUM ? "Pesan gagal dikirim." : r.error);
    }
    setMengirim(false);
  };

  return (
    <>
      {sukses && (
        <div ref={kotakSukses} id="form-success" className="ub-success">
          <b aria-hidden="true">&#10003;</b>
          <span>Terima kasih! Pesanmu sudah kami terima dan akan segera kami tindaklanjuti.</span>
        </div>
      )}
      {galat && (
        <p id="form-error" className="ub-error" role="alert">
          {galat}
        </p>
      )}
      {siap && !user && (
        <p id="form-login-info" className="ub-error" role="status">
          {PESAN_MASUK}{" "}
          <a href="login.html">Masuk</a>
        </p>
      )}
      <form id="feedback-form" className="ub-form" noValidate onSubmit={kirim}>
        <div className="field-row">
          <Kolom id="fb-nama" label="Nama Lengkap">
            <input type="text" id="fb-nama" name="nama" placeholder="Nama kamu" autoComplete="name" required />
          </Kolom>
          <Kolom id="fb-email" label="Email">
            <input
              type="email"
              id="fb-email"
              name="email"
              key={user?.email ?? "kosong"}
              defaultValue={user?.email ?? ""}
              readOnly={!!user}
              placeholder="nama@email.com"
              autoComplete="email"
              required
            />
          </Kolom>
        </div>
        <Kolom id="fb-pesan" label="Pesan">
          <textarea id="fb-pesan" name="pesan" placeholder="Tulis pesan kamu di sini..." required />
        </Kolom>
        <Tombol type="submit" besar disabled={mengirim}>
          Kirim Pesan
        </Tombol>
      </form>
    </>
  );
}