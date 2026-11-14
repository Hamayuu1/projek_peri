import { useCallback, useEffect, useState } from "react";
import { BAWAAN, KUNCI, muat, simpan, terapkan, type Preferensi } from "../lib/aksesibilitas";

/** Status pengaturan aksesibilitas: diterapkan ke halaman dan disimpan setiap kali berubah. */
export function useAksesibilitas() {
  const [pref, setPref] = useState<Preferensi>(muat);

  useEffect(() => {
    terapkan(pref);
    simpan(pref);
  }, [pref]);

  // Tab lain mengubah pengaturan: ikuti.
  useEffect(() => {
    const saatUbah = (e: StorageEvent): void => {
      if (e.key === KUNCI) setPref(muat());
    };
    window.addEventListener("storage", saatUbah);
    return () => window.removeEventListener("storage", saatUbah);
  }, []);

  const ubah = useCallback(<K extends keyof Preferensi>(kunci: K, nilai: Preferensi[K]): void => {
    setPref((p) => ({ ...p, [kunci]: nilai }));
  }, []);

  const aturUlang = useCallback((): void => setPref({ ...BAWAAN }), []);

  return { pref, ubah, aturUlang };
}