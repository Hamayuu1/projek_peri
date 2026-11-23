import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PULAU } from "./registry";

// Mencari setiap elemen <div data-react="Nama" data-props='{"a":1}'></div>
// lalu memasang komponen React bernama itu ke dalamnya.
export async function initReact(): Promise<void> {
  const titik = document.querySelectorAll<HTMLElement>("[data-react]");

  await Promise.all(
    Array.from(titik).map(async (el) => {
      const nama = el.dataset.react ?? "";
      const muat = PULAU[nama];
      if (!muat) {
        console.warn(`[react] Komponen "${nama}" belum didaftarkan di src/react/registry.ts`);
        return;
      }

      let props: Record<string, unknown> = {};
      try {
        if (el.dataset.props) props = JSON.parse(el.dataset.props);
      } catch {
        console.warn(`[react] data-props pada "${nama}" bukan JSON yang valid`);
      }

      const { default: Komponen } = await muat();
      createRoot(el).render(
        <StrictMode>
          <Komponen {...props} />
        </StrictMode>,
      );
    }),
  );
}