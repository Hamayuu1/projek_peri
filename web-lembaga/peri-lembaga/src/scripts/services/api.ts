import type {
  ApiResult,
  BukuTamuInput,
  LoginInput,
  PendaftaranProgramInput,
  RegisterInput,
  RingkasanPendaftaran,
  User,
} from "../types";

/** Alamat peri-backend (python app.py, port 5001) mengikuti host halaman. */
export const API_BASE = `http://${location.hostname || "127.0.0.1"}:5001`;

const ERR_UMUM = "Terjadi kesalahan. Coba lagi.";
const ERR_SERVER = "Server belum aktif. Jalankan peri-backend (python app.py).";

export async function request<T extends object = Record<string, never>>(
  path: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(API_BASE + path, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data: Record<string, unknown> = {};
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      // isi respons bukan JSON; pakai data kosong
    }
    const pesan = typeof data.error === "string" && data.error ? data.error : ERR_UMUM;
    return { ok: res.ok, status: res.status, data: data as T, error: pesan };
  } catch {
    return { ok: false, status: 0, data: {} as T, error: ERR_SERVER };
  }
}

export const authApi = {
  me: () => request<{ user: User }>("/api/auth/me"),
  login: (b: LoginInput) => request<{ user: User }>("/api/auth/login", "POST", b),
  register: (b: RegisterInput) =>
    request<{ user: User }>("/api/auth/register", "POST", b),
  logout: () => request("/api/auth/logout", "POST"),
  kirimKode: (email: string) =>
    request<{ pesan?: string }>("/api/auth/kirim-kode", "POST", { email }),
};

export const kirimBukuTamu = (b: BukuTamuInput) =>
  request("/api/buku-tamu", "POST", b);

export const kirimPendaftaranProgram = (b: PendaftaranProgramInput) =>
  request<{ data?: RingkasanPendaftaran; kolom?: string }>(
    "/api/pendaftaran-program",
    "POST",
    b,
  );