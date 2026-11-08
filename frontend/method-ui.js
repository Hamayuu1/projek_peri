(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  let loading = false;
  let loaded = false;

  async function fetchJson(url) {
    let response;
    try {
      response = await fetch(url);
    } catch {
      throw new Error("Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.");
    }
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("Server mengirim respons yang bukan JSON valid.");
    }
    if (!response.ok) throw new Error(result.detail || "Permintaan ke server gagal.");
    return result;
  }

  async function loadMethodData(force = false) {
    if (loading || (loaded && !force)) return;
    loading = true;
    loaded = false;
    $("#methodLoading").classList.remove("hidden");
    $("#methodError").classList.add("hidden");
    $("#methodMetrics").classList.add("hidden");
    $("#topWordsLoading").classList.remove("hidden");
    $("#topWordsError").classList.add("hidden");
    $("#topWordsGrid").replaceChildren();
    try {
      const [metrics, config] = await Promise.all([
        fetchJson("/api/metrics"),
        fetchJson("/api/config"),
      ]);
      $("#methodMetrics").classList.remove("hidden");
      window.PeriMetrics.renderDashboard($("#methodMetrics"), metrics, {
        demoMode: config.demo_mode,
        showTopWords: false,
      });
      $("#methodLoading").classList.add("hidden");
      loaded = true;
      try {
        const topWords = await fetchJson("/api/top-words");
        $("#topWordsGrid").innerHTML = window.PeriMetrics.topWordCards(topWords);
      } catch (error) {
        $("#topWordsError").textContent = `Kata teratas tidak dapat dimuat: ${error.message}`;
        $("#topWordsError").classList.remove("hidden");
      } finally {
        $("#topWordsLoading").classList.add("hidden");
      }
    } catch (error) {
      $("#methodLoading").classList.add("hidden");
      $("#methodError").textContent = `Metrik evaluasi tidak dapat dimuat: ${error.message}`;
      $("#methodError").classList.remove("hidden");
      $("#topWordsLoading").classList.add("hidden");
    } finally {
      loading = false;
    }
  }

  document.querySelectorAll('[data-tab="method"]').forEach((tab) => {
    tab.addEventListener("click", () => loadMethodData());
  });
  document.querySelectorAll('[data-open-tab="method"]').forEach((button) => {
    button.addEventListener("click", () => loadMethodData());
  });
  $("#methodRefreshButton")?.addEventListener("click", () => loadMethodData(true));
})();
