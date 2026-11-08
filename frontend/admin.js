(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const tokenInput = $("#adminToken");
  const fileInput = $("#csvFile");
  const importButton = $("#importButton");
  const retrainButton = $("#retrainButton");
  const deleteButton = $("#deleteDemoButton");

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  }

  function showNotice(message, type = "success") {
    const element = $("#adminNotice");
    element.textContent = message;
    element.className = `notice${type === "error" ? " error" : type === "info" ? " info" : ""}`;
    element.classList.remove("hidden");
  }

  function getToken() {
    const token = tokenInput.value.trim();
    if (!token) {
      showNotice("Masukkan token admin terlebih dahulu.", "error");
      tokenInput.focus();
      return null;
    }
    return token;
  }

  async function requestJson(url, options = {}) {
    let response;
    try {
      response = await fetch(url, options);
    } catch {
      throw new Error("Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.");
    }
    let body;
    try {
      body = await response.json();
    } catch {
      throw new Error("Server mengirim respons yang bukan JSON valid.");
    }
    if (!response.ok) throw new Error(body.detail || "Permintaan admin gagal.");
    return body;
  }

  function setBusy(button, busy, label) {
    button.disabled = busy;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.textContent = label;
    } else {
      button.innerHTML = button.dataset.originalText || label;
      delete button.dataset.originalText;
    }
  }

  function renderImportReport(report) {
    const rejections = Array.isArray(report.penolakan) ? report.penolakan : [];
    $("#importReport").innerHTML = `<div class="report-summary">
      <div><span>Total baris</span><strong>${Number(report.jumlah_baris || 0).toLocaleString("id-ID")}</strong></div>
      <div class="report-accepted"><span>Berhasil diimpor</span><strong>${Number(report.masuk || 0).toLocaleString("id-ID")}</strong></div>
      <div class="report-rejected"><span>Ditolak</span><strong>${Number(report.ditolak || 0).toLocaleString("id-ID")}</strong></div>
    </div>
    ${rejections.length ? `<details class="rejection-details"><summary>Lihat ${rejections.length} catatan baris ditolak</summary><ul>${rejections.map((item) => `<li><strong>Baris ${Number(item.baris)}:</strong> ${escapeHtml(item.alasan)}</li>`).join("")}</ul></details>` : '<p class="success-caption">Semua baris yang diperiksa berhasil diimpor.</p>'}`;
    $("#importReport").classList.remove("hidden");
  }

  function setFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showNotice("Pilih file dengan ekstensi .csv.", "error");
      fileInput.value = "";
      $("#fileName").textContent = "Pilih atau letakkan file CSV di sini";
      return;
    }
    $("#fileName").textContent = file.name;
    $("#dropZone").classList.add("file-selected");
  }

  async function importCsv(event) {
    event.preventDefault();
    const token = getToken();
    if (!token) return;
    const file = fileInput.files?.[0];
    if (!file) {
      showNotice("Pilih file CSV yang akan diimpor.", "error");
      fileInput.focus();
      return;
    }
    setBusy(importButton, true, "Mengimpor...");
    try {
      const body = new FormData();
      body.append("file", file);
      const report = await requestJson("/api/admin/import", {
        method: "POST",
        headers: { "X-Admin-Token": token },
        body,
      });
      renderImportReport(report);
      showNotice(`${Number(report.masuk || 0)} dari ${Number(report.jumlah_baris || 0)} baris berhasil diimpor.`, report.ditolak ? "info" : "success");
    } catch (error) {
      showNotice(`Impor CSV gagal: ${error.message}`, "error");
    } finally {
      setBusy(importButton, false, "Impor data");
    }
  }

  async function retrain() {
    const token = getToken();
    if (!token) return;
    setBusy(retrainButton, true, "Melatih ulang...");
    $("#retrainResults").classList.add("hidden");
    try {
      const metrics = await requestJson("/api/admin/retrain", {
        method: "POST",
        headers: { "X-Admin-Token": token },
      });
      $("#retrainResults").classList.remove("hidden");
      window.PeriMetrics.renderDashboard($("#adminMetricsDashboard"), metrics, {
        demoMode: false,
        showTopWords: false,
      });
      $("#retrainResults").scrollIntoView({ behavior: "smooth", block: "start" });
      showNotice(`Pelatihan selesai. Model terbaik berdasarkan macro F1: ${window.PeriMetrics.modelLabels[metrics.model_terbaik_macro_f1] || metrics.model_terbaik_macro_f1}.`);
    } catch (error) {
      showNotice(`Pelatihan ulang gagal: ${error.message}`, "error");
    } finally {
      setBusy(retrainButton, false, "Latih ulang model");
    }
  }

  async function deleteDemoData() {
    const token = getToken();
    if (!token) return;
    const confirmed = window.confirm("Hapus semua ulasan yang ditandai sebagai data demo? Ulasan lainnya tidak akan dihapus.");
    if (!confirmed) return;
    setBusy(deleteButton, true, "Menghapus...");
    try {
      const result = await requestJson("/api/admin/demo-data", {
        method: "DELETE",
        headers: { "X-Admin-Token": token },
      });
      showNotice(result.message || `${Number(result.terhapus || 0)} ulasan demo dihapus.`);
    } catch (error) {
      showNotice(`Data demo tidak dapat dihapus: ${error.message}`, "error");
    } finally {
      setBusy(deleteButton, false, "Hapus Data Demo");
    }
  }

  fileInput.addEventListener("change", () => setFile(fileInput.files?.[0]));
  $("#dropZone").addEventListener("dragover", (event) => {
    event.preventDefault();
    $("#dropZone").classList.add("drag-over");
  });
  $("#dropZone").addEventListener("dragleave", (event) => {
    if (!event.relatedTarget || !$("#dropZone").contains(event.relatedTarget)) {
      $("#dropZone").classList.remove("drag-over");
    }
  });
  $("#dropZone").addEventListener("drop", (event) => {
    event.preventDefault();
    $("#dropZone").classList.remove("drag-over");
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    try {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      fileInput.files = transfer.files;
      setFile(file);
    } catch {
      showNotice("File tidak dapat dipilih dari area drop. Gunakan tombol pilih file.", "error");
    }
  });
  $("#importForm").addEventListener("submit", importCsv);
  retrainButton.addEventListener("click", retrain);
  deleteButton.addEventListener("click", deleteDemoData);
  tokenInput.addEventListener("input", () => {
    if (!$("#adminNotice").classList.contains("hidden")) {
      $("#adminNotice").classList.add("hidden");
    }
  });
})();
