// Pengaturan aksesibilitas pengunjung: disimpan di browser dan diterapkan sebagai
// atribut pada <html> (data-a11y-*). Seluruh efek visualnya ada di styles/aksesibilitas.css
// dan hanya aktif bila atributnya ada, jadi tampilan bawaan situs tidak berubah.

export type UkuranTeks = 0 | 1 | 2; // 0 = normal, 1 = besar, 2 = lebih besar

export type Preferensi = {
  teks: UkuranTeks;
  kontras: boolean;
  animasi: boolean; // true = kurangi animasi
  tautan: boolean; // true = tandai tautan
  font: boolean; // true = font mudah dibaca
  jarak: boolean; // true = jarak teks lebih lebar
  latar: boolean; // true = sembunyikan gambar latar
};

export const BAWAAN: Preferensi = {
  teks: 0,
  kontras: false,
  animasi: false,
  tautan: false,
  font: false,
  jarak: false,
  latar: false,
};

export const KUNCI = "peri:aksesibilitas";

const NAMA_TEKS = ["", "besar", "lebih-besar"] as const;
const BENDERA = ["kontras", "animasi", "tautan", "font", "jarak", "latar"] as const;

export function muat(): Preferensi {
  try {
    const mentah = localStorage.getItem(KUNCI);
    if (!mentah) return { ...BAWAAN };
    const data = JSON.parse(mentah) as Partial<Preferensi>;
    return {
      teks: data.teks === 1 || data.teks === 2 ? data.teks : 0,
      kontras: data.kontras === true,
      animasi: data.animasi === true,
      tautan: data.tautan === true,
      font: data.font === true,
      jarak: data.jarak === true,
      latar: data.latar === true,
    };
  } catch {
    return { ...BAWAAN }; // penyimpanan diblokir atau isinya rusak
  }
}

export function simpan(p: Preferensi): void {
  try {
    localStorage.setItem(KUNCI, JSON.stringify(p));
  } catch {
    /* penyimpanan tidak tersedia: pengaturan tetap berlaku selama halaman terbuka */
  }
}

export function terapkan(p: Preferensi): void {
  const root = document.documentElement;
  if (p.teks > 0) root.setAttribute("data-a11y-teks", NAMA_TEKS[p.teks]);
  else root.removeAttribute("data-a11y-teks");
  for (const nama of BENDERA) {
    if (p[nama]) root.setAttribute(`data-a11y-${nama}`, "");
    else root.removeAttribute(`data-a11y-${nama}`);
  }
}

/** Dipanggil paling awal di main.ts supaya pengaturan langsung berlaku saat halaman dibuka. */
export function terapkanTersimpan(): void {
  terapkan(muat());
}