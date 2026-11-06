/* Katalog program yang dibaca dari kartu di halaman Program.
   Markup kartu (program.html) wajib memakai atribut ini:
     <article data-program-card data-nama="..." data-kategori="...">
       <img ...>  <p data-program-desc>...</p>
*/
import type { ProgramInfo } from "../../types";

const PILIH_KARTU = "[data-program-card][data-nama]";

export function infoDariKartu(kartu: Element): ProgramInfo {
  const gambar = kartu.querySelector("img");
  const deskripsi = kartu.querySelector("[data-program-desc]");
  return {
    nama: kartu.getAttribute("data-nama") ?? "",
    kategori: kartu.getAttribute("data-kategori") ?? "",
    deskripsi: (deskripsi?.textContent ?? "").replace(/\s+/g, " ").trim(),
    gambar: gambar?.getAttribute("src") ?? "",
  };
}

export function semuaProgram(): ProgramInfo[] {
  return Array.from(document.querySelectorAll(PILIH_KARTU), infoDariKartu);
}

export function cariProgram(nama: string): ProgramInfo {
  return (
    semuaProgram().find((p) => p.nama === nama) ?? {
      nama,
      kategori: "",
      deskripsi: "",
      gambar: "",
    }
  );
}

/** Gulir ke daftar program di halaman. */
export function keDaftarProgram(): void {
  document
    .getElementById("program-grid")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}