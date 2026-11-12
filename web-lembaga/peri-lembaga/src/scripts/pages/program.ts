/* Halaman Program. Pencarian, filter, katalog, dan pop-up "Daftar Program"
   sudah berupa komponen React (src/react/islands/KatalogProgram.tsx dan DaftarProgram.tsx).
   Yang tersisa di sini: wizard "Temukan Program" (dipindahkan pada tahap berikutnya). */
import { initTemukanProgram } from "./program/temukan-program";

export function init(): void {
  initTemukanProgram();
}