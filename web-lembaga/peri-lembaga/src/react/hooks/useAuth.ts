import { useEffect, useState } from "react";
import { authApi } from "../../scripts/services/api";
import type { User } from "../../scripts/types";

// Status login yang dibagi ke semua komponen React.
// - Membaca sesi dari peri-backend saat pertama dipasang.
// - Ikut berubah saat pop-up login mengirim peristiwa "peri:login".
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [siap, setSiap] = useState(false); // true setelah pengecekan sesi selesai

  useEffect(() => {
    let batal = false;
    void authApi.me().then((r) => {
      if (batal) return;
      setUser(r.ok ? r.data.user : null);
      setSiap(true);
    });
    const saatLogin = (e: CustomEvent<User>): void => setUser(e.detail);
    document.addEventListener("peri:login", saatLogin);
    return () => {
      batal = true;
      document.removeEventListener("peri:login", saatLogin);
    };
  }, []);

  const keluar = async (): Promise<void> => {
    await authApi.logout();
    location.reload();
  };

  return { user, siap, keluar };
}