/** Escape teks sebelum disisipkan ke string HTML (innerHTML). */
export function esc(nilai: unknown): string {
  return String(nilai ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}