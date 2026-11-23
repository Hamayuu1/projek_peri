import type { ReactNode } from "react";

// Satu kolom formulir (label + isian), memakai kelas .field di styles/components/form.css.
// Contoh: <Kolom id="fb-nama" label="Nama Lengkap"><input id="fb-nama" ... /></Kolom>
type Props = {
  id: string;
  label: string;
  children: ReactNode;
};

export function Kolom({ id, label, children }: Props) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}