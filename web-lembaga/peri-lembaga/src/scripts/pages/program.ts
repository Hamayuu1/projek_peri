/* Halaman Program: pencarian dan filter kategori, wizard "Temukan Program",
   dan pop-up "Daftar Program". */
import { initDaftarProgram } from "./program/daftar-program";
import { initTemukanProgram } from "./program/temukan-program";

function initFilter(): void {
  const cari = document.getElementById("search-program") as HTMLInputElement | null;
  const kategori = document.getElementById("filter-kategori") as HTMLSelectElement | null;
  const kosong = document.getElementById("program-empty");
  const kartu = Array.from(document.querySelectorAll<HTMLElement>("[data-program-card]"));
  const tombolLebih = document.querySelector<HTMLElement>("[data-program-lebih]");
  const wadahLebih = tombolLebih?.parentElement ?? null;
  if (!cari || !kategori) return;

  // Kartu bertanda data-lebih disembunyikan dulu; tombol "Lihat Program Lainnya" menampilkannya.
  // Saat mencari atau memfilter, semua program ikut disaring (tidak ada yang terlewat).
  let semua = false;

  const terapkan = (): void => {
    const kata = cari.value.trim().toLowerCase();
    const pilih = kategori.value;
    const menyaring = kata !== "" || pilih !== "";
    let cocok = 0;
    kartu.forEach((k) => {
      const lolos =
        (k.dataset.nama ?? "").toLowerCase().includes(kata) &&
        (!pilih || k.dataset.kategori === pilih);
      const ditahan = !semua && !menyaring && k.hasAttribute("data-lebih");
      k.hidden = !lolos || ditahan;
      if (lolos) cocok++;
    });
    if (kosong) kosong.hidden = cocok !== 0;
    if (wadahLebih) wadahLebih.hidden = semua || menyaring;
  };

  cari.addEventListener("input", terapkan);
  kategori.addEventListener("change", terapkan);
  tombolLebih?.addEventListener("click", () => {
    semua = true;
    terapkan();
  });
  terapkan();
}

export function init(): void {
  initFilter();
  initTemukanProgram();
  initDaftarProgram();
}