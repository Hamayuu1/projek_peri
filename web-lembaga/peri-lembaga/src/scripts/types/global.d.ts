import type { AuthView, User } from "./index";

declare global {
  interface Window {
    /** Dipakai skrip lain (mis. pop-up Daftar Program) untuk membuka modal login. */
    PERIAuth?: {
      open(view: AuthView): void;
      close(): void;
    };
  }

  interface DocumentEventMap {
    /** Dikirim setelah login berhasil. */
    "peri:login": CustomEvent<User>;
    /** Dikirim agar pop-up Temukan Program menutup diri. */
    "peri:lihat-program": CustomEvent<void>;
  }
}

export {};