/* Animasi muncul untuk elemen bertanda data-reveal.
   - Elemen yang sudah terlihat saat halaman dimuat: muncul berurutan (entrance).
   - Elemen di bawah layar: muncul saat di-scroll (IntersectionObserver).
   Tanpa JavaScript atau dengan "kurangi gerakan", semua konten tampil normal.
   Gaya: styles/components/animations.css. */

const SELECTOR = "[data-reveal]";
const JEDA_DASAR = 0.1; // detik
const JEDA_LANGKAH = 0.1;
const JEDA_MAKS_URUTAN = 5;

function jeda(urutan: number): string {
  return `${JEDA_DASAR + Math.min(urutan, JEDA_MAKS_URUTAN) * JEDA_LANGKAH}s`;
}

/** Hindari animasi ganda: buang elemen yang berada di dalam kandidat lain. */
function kumpulkan(lingkup: ParentNode): HTMLElement[] {
  const semua = Array.from(lingkup.querySelectorAll<HTMLElement>(SELECTOR));
  return semua.filter((el) => !semua.some((o) => o !== el && o.contains(el)));
}

function tampilkan(el: HTMLElement, urutan: number): void {
  el.style.setProperty("--reveal-delay", jeda(urutan));
  const selesai = (e: AnimationEvent): void => {
    if (e.target !== el) return;
    el.classList.remove("reveal", "is-visible");
    el.style.removeProperty("--reveal-delay");
    el.removeEventListener("animationend", selesai);
  };
  el.addEventListener("animationend", selesai);
  el.classList.add("is-visible");
}

/** `lingkup` membatasi pencarian elemen (dipakai komponen React); bawaannya seluruh halaman. */
export function initReveal(lingkup: ParentNode = document): void {
  if (!("IntersectionObserver" in window)) return; // biarkan semua tampil normal
  const root = document.documentElement;
  root.classList.add("anim-ready");
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const tinggi = window.innerHeight || root.clientHeight;
  const lebar = window.innerWidth || root.clientWidth;

  // Item karusel/baris geser yang berada di luar layar secara horizontal dibiarkan apa adanya.
  const target = kumpulkan(lingkup).filter((el) => {
    const r = el.getBoundingClientRect();
    const tampak = Math.min(r.right, lebar) - Math.max(r.left, 0);
    return tampak >= Math.min(r.width, lebar) * 0.5;
  });
  if (!target.length) return;

  target.forEach((el) => el.classList.add("reveal"));

  const awal: HTMLElement[] = []; // sudah terlihat saat dimuat
  const lain: HTMLElement[] = [];
  target.forEach((el) => {
    (el.getBoundingClientRect().top < tinggi * 0.95 ? awal : lain).push(el);
  });

  // Entrance: berurutan per induk agar jeda tidak terlalu lama.
  const hitung = new Map<ParentNode | null, number>();
  awal.forEach((el) => {
    const n = hitung.get(el.parentNode) ?? 0;
    hitung.set(el.parentNode, n + 1);
    tampilkan(el, n);
  });

  const obs = new IntersectionObserver(
    (entri) => {
      entri
        .filter((e) => e.isIntersecting)
        .forEach((e, i) => {
          obs.unobserve(e.target);
          tampilkan(e.target as HTMLElement, i);
        });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
  );
  lain.forEach((el) => obs.observe(el));
}