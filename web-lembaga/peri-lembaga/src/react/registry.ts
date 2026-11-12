import type { ComponentType } from "react";

// Daftar komponen React yang boleh dipasang pada halaman ("pulau").
// Kunci = nilai atribut data-react di HTML. Komponen dimuat hanya saat dipakai.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Pulau = () => Promise<{ default: ComponentType<any> }>;

export const PULAU: Record<string, Pulau> = {
  ContohPulau: () => import("./islands/ContohPulau"),
  Testimoni: () => import("./islands/Testimoni"),
  FormUmpanBalik: () => import("./islands/FormUmpanBalik"),
  // Tambahkan komponen baru di sini, misalnya:
  // PopupAuth: () => import("./islands/PopupAuth"),
};