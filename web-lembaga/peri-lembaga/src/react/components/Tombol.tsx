import type { ButtonHTMLAttributes } from "react";

// Tombol dengan gaya yang sama seperti kelas .btn di styles/components/button.css.
type Varian = "primary" | "outline" | "maroon" | "gold" | "light";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  varian?: Varian;
  besar?: boolean;
};

export function Tombol({ varian = "primary", besar = false, className, type = "button", ...sisa }: Props) {
  const kelas = ["btn", `btn--${varian}`, besar ? "btn--lg" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return <button type={type} className={kelas} {...sisa} />;
}