/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Alamat panel admin (peri-admin). Atur di .env.local bila admin dibuka dari alamat lain. */
  readonly VITE_ADMIN_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}