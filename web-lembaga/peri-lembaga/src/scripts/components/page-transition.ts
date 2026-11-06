/* Transisi antar-halaman. Browser yang mendukung View Transitions memakainya lewat
   CSS (@view-transition). Browser lain mendapat fade lewat kelas `no-vt` dan `is-leaving`. */

const WAKTU_KELUAR_MS = 240;

function dukungViewTransition(): boolean {
  return (
    "CSSViewTransition" in window ||
    (window.CSS?.supports?.("selector(::view-transition)") ?? false)
  );
}

export function initPageTransition(): void {
  const root = document.documentElement;
  if (dukungViewTransition()) return;
  root.classList.add("no-vt");
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  window.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
    if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
    const href = a.getAttribute("href") ?? "";
    if (/^(#|mailto:|tel:|javascript:)/i.test(href)) return;
    let url: URL;
    try {
      url = new URL(a.href, location.href);
    } catch {
      return;
    }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return; // anchor atau halaman sama
    e.preventDefault();
    root.classList.add("is-leaving");
    setTimeout(() => {
      location.href = url.href;
    }, WAKTU_KELUAR_MS);
  });

  window.addEventListener("pageshow", (e) => {
    if (e.persisted) root.classList.remove("is-leaving");
  });
}