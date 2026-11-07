// Titik masuk bersama semua halaman.
// Setiap HTML memuat skrip ini dan menandai dirinya: <body data-page="program">.
import "../styles/main.css";
import { initAuthModal } from "./components/auth-modal";
import { initPageTransition } from "./components/page-transition";
import { initReveal } from "./components/reveal";

type ModulHalaman = { init: () => void };

// Skrip khusus per halaman, dimuat hanya di halaman yang memerlukannya.
const HALAMAN: Record<string, () => Promise<ModulHalaman>> = {
  program: () => import("./pages/program"),
  hubungi: () => import("./pages/umpan-balik"),
};

async function mulai(): Promise<void> {
  initAuthModal();
  const muat = HALAMAN[document.body.dataset.page ?? ""];
  if (muat) (await muat()).init();
  // Setelah skrip halaman, agar kartu yang dibuatnya ikut dianimasikan.
  initReveal();
  initPageTransition();
}

void mulai();