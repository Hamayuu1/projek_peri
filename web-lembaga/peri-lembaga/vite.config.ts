import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

// Modul rekomendasi ada di folder sejajar (web-lembaga/peri-rekomendasi).
const REKOMENDASI_DIR = fileURLToPath(new URL("../peri-rekomendasi", import.meta.url));

const PARTIALS_DIR = fileURLToPath(new URL("./src/partials/", import.meta.url));

// Penanda di HTML:  <!-- @include navbar page="program" -->
// Diganti isi src/partials/navbar.html. Atribut page menandai menu aktif
// (aria-current="page") pada tautan yang punya data-nav yang sama.
const INCLUDE = /<!--\s*@include\s+([\w-]+)(?:\s+page="([\w-]+)")?\s*-->/g;

function partials(): Plugin {
  return {
    name: "peri-partials",
    configureServer(server) {
      server.watcher.add(PARTIALS_DIR);
      server.watcher.on("change", (file) => {
        if (file.startsWith(PARTIALS_DIR)) server.ws.send({ type: "full-reload" });
      });
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return html.replace(INCLUDE, (_marker, name: string, page?: string) => {
          let part = readFileSync(`${PARTIALS_DIR}${name}.html`, "utf8");
          if (page) {
            part = part.replace(`data-nav="${page}"`, `data-nav="${page}" aria-current="page"`);
          }
          return part;
        });
      },
    },
  };
}

// Situs multi-halaman: setiap file HTML di akar proyek menjadi satu titik masuk.
export default defineConfig({
  plugins: [partials()],
  resolve: {
    alias: { "@rekomendasi": `${REKOMENDASI_DIR}/index.js` },
  },
  server: {
    port: 5173,
    fs: { allow: [".."] }, // izinkan membaca ../peri-rekomendasi saat dev
    open: "/beranda.html",
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        beranda: "beranda.html",
        program: "program.html",
        tentang: "tentang.html",
        dokumentasi: "dokumentasi.html",
        hubungi: "hubungi.html",
      },
    },
  },
});