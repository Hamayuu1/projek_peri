import { useEffect, useRef, useState } from "react";

// Tombol hamburger di navbar (hanya tampil di layar <= 960px lewat CSS).
// Menandai <header class="site-header"> dengan:
//   data-menu="open" -> panel menu sedang terbuka (CSS menampilkan tautan dan tombol)
const BATAS_DESKTOP = "(min-width: 961px)";

export default function NavbarMenu() {
  const [buka, setBuka] = useState(false);
  const tombol = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) return;
    if (buka) header.setAttribute("data-menu", "open");
    else header.removeAttribute("data-menu");
  }, [buka]);

  useEffect(() => {
    if (!buka) return;

    const saatKey = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") return;
      // Pop-up login / daftar program punya penanganan Esc sendiri.
      if (document.querySelector(".auth-overlay, .dp-overlay")) return;
      setBuka(false);
      tombol.current?.focus();
    };
    const saatKlik = (e: MouseEvent): void => {
      const el = e.target as Element | null;
      if (!el) return;
      // Menu menutup setelah memilih tautan atau tombol di panel, atau klik di luar header.
      if (el.closest(".navbar-links a, .navbar-actions a, .navbar-actions button") || !el.closest(".site-header")) {
        setBuka(false);
      }
    };
    const mq = window.matchMedia(BATAS_DESKTOP);
    const saatUbahLayar = (): void => {
      if (mq.matches) setBuka(false);
    };

    document.addEventListener("keydown", saatKey);
    document.addEventListener("click", saatKlik);
    mq.addEventListener("change", saatUbahLayar);
    return () => {
      document.removeEventListener("keydown", saatKey);
      document.removeEventListener("click", saatKlik);
      mq.removeEventListener("change", saatUbahLayar);
    };
  }, [buka]);

  return (
    <button
      ref={tombol}
      type="button"
      className="navbar-toggle"
      aria-label={buka ? "Tutup menu" : "Buka menu"}
      aria-expanded={buka}
      aria-controls="menu-utama"
      onClick={() => setBuka((b) => !b)}
    >
      <span className="navbar-toggle-bar" aria-hidden="true" />
      <span className="navbar-toggle-bar" aria-hidden="true" />
      <span className="navbar-toggle-bar" aria-hidden="true" />
    </button>
  );
}