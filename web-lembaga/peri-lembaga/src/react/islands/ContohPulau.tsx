import { useState } from "react";

// Komponen contoh untuk memastikan React sudah terpasang.
// Pakai di HTML:  <div data-react="ContohPulau" data-props='{"judul":"Uji React"}'></div>
// Hapus file ini dan barisnya di registry.ts setelah komponen pertama yang asli selesai.
type Props = { judul?: string };

export default function ContohPulau({ judul = "React aktif" }: Props) {
  const [klik, setKlik] = useState(0);
  return (
    <p>
      {judul}.{" "}
      <button type="button" className="btn btn--primary" onClick={() => setKlik(klik + 1)}>
        Diklik {klik} kali
      </button>
    </p>
  );
}