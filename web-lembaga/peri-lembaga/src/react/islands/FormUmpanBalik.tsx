import { useEffect, useRef, useState, type FormEvent } from "react";
import { kirimBukuTamu } from "../../scripts/services/api";
import { Kolom } from "../components/Kolom";
import { Tombol } from "../components/Tombol";

// Formulir umpan balik: validasi di browser, lalu dikirim ke peri-backend dan
// tampil di menu Buku Tamu pada panel admin.
const ERR_UMUM = "Terjadi kesalahan. Coba lagi.";

export default function FormUmpanBalik() {
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
      <form id="feedback-form" className="ub-form" noValidate onSubmit={kirim}>
        <div className="field-row">
          <Kolom id="fb-nama" label="Nama Lengkap">
            <input type="text" id="fb-nama" name="nama" placeholder="Nama kamu" autoComplete="name" required />
          </Kolom>
          <Kolom id="fb-email" label="Email">
            <input type="email" id="fb-email" name="email" placeholder="nama@email.com" autoComplete="email" required />
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