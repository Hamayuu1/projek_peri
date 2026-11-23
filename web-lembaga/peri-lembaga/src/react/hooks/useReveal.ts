import { useEffect, type RefObject } from "react";
import { initReveal } from "../../scripts/components/reveal";

// Menjalankan animasi "muncul" pada elemen data-reveal di dalam komponen ini.
// Diperlukan karena animasi halaman dijalankan sebelum React selesai merender.
export function useReveal(wadah: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (wadah.current) initReveal(wadah.current);
  }, [wadah]);
}