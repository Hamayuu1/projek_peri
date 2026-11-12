// Titik masuk bersama semua halaman.
// Memuat CSS, animasi, transisi halaman, dan memasang komponen React.
import "../styles/main.css";
import { initReact } from "../react/mount";
import { initPageTransition } from "./components/page-transition";
import { initReveal } from "./components/reveal";

// Komponen React ("pulau") dipasang pada elemen [data-react] (lihat src/react/README.md).
void initReact();
initReveal();
initPageTransition();