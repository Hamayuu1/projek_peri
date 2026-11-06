/* Halaman Program: pencarian dan filter kategori, wizard "Temukan Program",
   dan pop-up "Daftar Program". */
import { initDaftarProgram } from "./program/daftar-program";
import { initTemukanProgram } from "./program/temukan-program";

function initFilter(): void {
  const cari = document.getElementById("search-program") as HTMLInputElement | null;
  const kategori = document.getElementById("filter-kategori") as HTMLSelectElement | null;
  const kosong = document.getElementById("program-empty");
  const kartu = Array.from(document.querySelectorAll<HTMLElement>("[data-program-card]"));
  if (!cari || !kategori) return;

  const terapkan = (): void => {
    const kata = cari.value.trim().toLowerCase();
    const pilih = kategori.value;
    let tampil = 0;
    kartu.forEach((k) => {
      const cocokNama = (k.dataset.nama ?? "").toLowerCase().includes(kata);
      const cocokKategori = !pilih || k.dataset.kategori === pilih;
      k.hidden = !(cocokNama && cocokKategori);
      if (!k.hidden) tampil++;
    });
    if (kosong) kosong.hidden = tampil !== 0;
  };

  cari.addEventListener("input", terapkan);
  kategori.addEventListener("change", terapkan);
}

export function init(): void {
  initFilter();
  initTemukanProgram();
  initDaftarProgram();
}