import { defineConfig } from "vite";

// Situs multi-halaman: setiap file HTML di akar proyek menjadi satu titik masuk.
export default defineConfig({
  server: {
    port: 5173,
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