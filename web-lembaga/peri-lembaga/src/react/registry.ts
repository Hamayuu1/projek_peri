import type { ComponentType } from "react";

// Daftar komponen React yang boleh dipasang pada halaman ("pulau").
// Kunci = nilai atribut data-react di HTML. Komponen dimuat hanya saat dipakai.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Pulau = () => Promise<{ default: ComponentType<any> }>;

export const PULAU: Record<string, Pulau> = {
  Testimoni: () => import("./islands/Testimoni"),
  FormUmpanBalik: () => import("./islands/FormUmpanBalik"),
  NavbarAksi: () => import("./islands/NavbarAksi"),
  NavbarMenu: () => import("./islands/NavbarMenu"),
  KatalogProgram: () => import("./islands/KatalogProgram"),
  DaftarProgram: () => import("./islands/DaftarProgram"),
  TemukanProgram: () => import("./islands/TemukanProgram"),
  Aksesibilitas: () => import("./islands/Aksesibilitas"),
  // Tambahkan komponen baru di sini.
};