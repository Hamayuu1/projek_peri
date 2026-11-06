/** Pengguna yang sedang masuk (dari API autentikasi peri-backend). */
export interface User {
  email: string;
  role: string; // "admin" atau peran pendaftar
}

/** Hasil pemanggilan API; `error` selalu berisi pesan yang siap ditampilkan. */
export interface ApiResult<T> {
  ok: boolean;
  status: number; // 0 = server tidak terjangkau
  data: T;
  error: string;
}

export type AuthView = "login" | "register";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  kode: string;
  password: string;
}

export interface BukuTamuInput {
  nama: string;
  email: string;
  pesan: string;
}

/** Umpan balik yang sudah ditinjau admin dan boleh tampil di situs. */
export interface UmpanBalikDisetujui {
  nama: string;
  program: string;
  pesan: string;
  bintang: number;
  /** true = contoh tampilan; kartu diberi label "Contoh". */
  contoh?: boolean;
}

/** Data satu program, dibaca dari kartu di halaman Program. */
export interface ProgramInfo {
  nama: string;
  kategori: string;
  deskripsi: string;
  gambar: string;
}

/** Isi formulir Daftar Program yang dikirim ke peri-backend. */
export interface PendaftaranProgramInput {
  program: string;
  nama: string;
  email: string;
  wa: string;
  setuju: boolean;
}

/** Ringkasan pendaftaran yang dikembalikan server (atau isian pengguna bila server tidak mengirimnya). */
export interface RingkasanPendaftaran {
  program: string;
  nama: string;
  email: string;
  wa: string;
}