<<<<<<< HEAD
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

// Modul rekomendasi ada di folder sejajar (web-lembaga/peri-rekomendasi).
const REKOMENDASI_DIR = fileURLToPath(new URL("../peri-rekomendasi", import.meta.url));

=======
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const ADMIN_DIR = fileURLToPath(new URL("../peri-admin/", import.meta.url));
const REKOMENDASI_DIR = fileURLToPath(new URL("../peri-rekomendasi", import.meta.url));
>>>>>>> web-lembaga
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

<<<<<<< HEAD
// Situs multi-halaman: setiap file HTML di akar proyek menjadi satu titik masuk.
export default defineConfig({
  plugins: [partials()],
=======
// Saat npm run dev, panel admin (folder ../peri-admin, HTML biasa) ikut
// dilayani di /peri-admin/ pada port yang sama, jadi Live Server tidak perlu.
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function adminPanel(): Plugin {
  return {
    name: "peri-admin-panel",
    configureServer(server) {
      server.middlewares.use("/peri-admin", (req, res, next) => {
        const path = decodeURIComponent((req.url ?? "/").split("?")[0]);
        const rel = normalize(path === "/" ? "/index.html" : path).replace(/^([/\\]|\.\.)+/, "");
        const file = join(ADMIN_DIR, rel);
        if (!file.startsWith(ADMIN_DIR) || !existsSync(file) || !statSync(file).isFile()) {
          return next();
        }
        res.setHeader("Content-Type", MIME[extname(file)] ?? "application/octet-stream");
        res.end(readFileSync(file));
      });
    },
  };
}

// Situs multi-halaman: setiap file HTML di akar proyek menjadi satu titik masuk.
export default defineConfig({
  plugins: [partials(), adminPanel()],
>>>>>>> web-lembaga
  resolve: {
    alias: { "@rekomendasi": `${REKOMENDASI_DIR}/index.js` },
  },
  server: {
<<<<<<< HEAD
    port: 5173,
    fs: { allow: [".."] }, // izinkan membaca ../peri-rekomendasi saat dev
=======
    // folder ../peri-rekomendasi dan ../peri-admin berada di luar akar proyek
    fs: { allow: [".."] },
    port: 5173,
>>>>>>> web-lembaga
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