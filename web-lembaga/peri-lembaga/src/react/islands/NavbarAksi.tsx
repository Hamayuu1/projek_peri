import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AuthView } from "../../scripts/types";
import AuthModal from "../components/AuthModal";
import { useAuth } from "../hooks/useAuth";
import { ADMIN_URL } from "../lib/config";

// Tombol di kanan navbar (Masuk/Daftar atau Panel Admin/Keluar) sekaligus pemilik pop-up login.
// Dipasang sekali di partial navbar, sehingga berlaku di semua halaman.
export default function NavbarAksi() {
  const { user, keluar } = useAuth();
  const [tampilan, setTampilan] = useState<AuthView | null>(null);
  const fokusTerakhir = useRef<HTMLElement | null>(null);

  const buka = useCallback((v: AuthView): void => {
    if (!document.querySelector(".auth-overlay")) {
      fokusTerakhir.current = document.activeElement as HTMLElement | null;
    }
    setTampilan(v);
  }, []);

  const tutup = useCallback((): void => {
    setTampilan(null);
    fokusTerakhir.current?.focus();
  }, []);

  // Pintu masuk untuk bagian lain di halaman:
  // - window.PERIAuth.open("login") dipakai pop-up Daftar Program
  // - tautan ke login.html / register.html di mana pun membuka pop-up ini
  useEffect(() => {
    window.PERIAuth = { open: buka, close: tutup };
    const saatKlik = (e: MouseEvent): void => {
      if (e.defaultPrevented) return;
      const a = (e.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (/(^|\/)login\.html$/.test(href)) {
        e.preventDefault();
        buka("login");
      } else if (/(^|\/)register\.html$/.test(href)) {
        e.preventDefault();
        buka("register");
      }
    };
    document.addEventListener("click", saatKlik);
    return () => {
      document.removeEventListener("click", saatKlik);
      delete window.PERIAuth;
    };
  }, [buka, tutup]);

  return (
    <>
      {user ? (
        <>
          {user.role === "admin" && (
            <a href={ADMIN_URL} className="btn btn--primary">
              Panel Admin
            </a>
          )}
          <a
            href="#"
            className="btn btn--outline"
            title={user.email}
            onClick={(e) => {
              e.preventDefault();
              void keluar();
            }}
          >
            Keluar
          </a>
        </>
      ) : (
        <>
          <a href="login.html" className="btn btn--outline">
            Masuk
          </a>
          <a href="register.html" className="btn btn--primary">
            Daftar
          </a>
        </>
      )}
      {tampilan && createPortal(<AuthModal tampilan={tampilan} onUbahTampilan={setTampilan} onTutup={tutup} />, document.body)}
    </>
  );
}