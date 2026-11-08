(() => {
  "use strict";

  const MODEL_COLORS = {
    MultinomialNB: "#a64d6a",
    SVC: "#167c70",
    Ensemble: "#d7953f",
  };
  const MODEL_LABELS = {
    MultinomialNB: "Naive Bayes",
    SVC: "SVM",
    Ensemble: "Ensemble",
  };
  const LABEL_COLORS = {
    positif: "#167c70",
    netral: "#d7953f",
    negatif: "#b4454f",
  };
  const charts = new WeakMap();

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  }

  function number(value, digits = 1) {
    const parsed = Number(value);
    return Number.isFinite(parsed)
      ? parsed.toLocaleString("id-ID", { maximumFractionDigits: digits })
      : "—";
  }

  function percent(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? `${(parsed * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%` : "—";
  }

  function metricValue(model, key) {
    const report = model.classification_report || {};
    if (key === "accuracy") return Number(model.accuracy?.mean || 0);
    if (key === "macro_f1") return Number(model.macro_f1 || 0);
    if (key === "precision" || key === "recall" || key === "f1") {
      const averages = report["weighted avg"] || report["macro avg"];
      if (averages && Number.isFinite(Number(averages[key] ?? averages[`${key}-score`]))) {
        return Number(averages[key] ?? averages[`${key}-score`]);
      }
      const classValues = Object.values(model.per_class || {});
      if (!classValues.length) return 0;
      return classValues.reduce((sum, item) => sum + Number(item[key] || 0), 0) / classValues.length;
    }
    return 0;
  }

  function formatTrainingDate(value) {
    if (!value) return "Tidak tersedia";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Tidak tersedia"
      : date.toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });
  }

  function renderDataset(metrics, demoMode, smallThreshold) {
    const distribution = metrics.distribusi_kelas || {};
    const labels = metrics.daftar_label || Object.keys(distribution);
    const isSmall = Number(metrics.jumlah_data) < smallThreshold;
    const notes = [];
    if (demoMode) {
      notes.push('<li><strong>Mode demo aktif.</strong> Angka dan masukan pada aplikasi dapat berasal dari data contoh; hasil belum tentu mewakili data produksi.</li>');
    }
    if (isSmall) {
      notes.push(`<li><strong>Dataset relatif kecil (${number(metrics.jumlah_data, 0)} data).</strong> Nilai evaluasi dapat berubah cukup besar ketika data bertambah.</li>`);
    }
    if (!notes.length) {
      notes.push("<li>Ukuran dataset memenuhi batas catatan ukuran kecil; tetap tinjau distribusi kelas dan konteks sebelum mengambil keputusan.</li>");
    }
    const distributionMarkup = labels.map((label) => `
      <span class="class-chip">
        <i class="legend-dot" style="background:${LABEL_COLORS[String(label).toLowerCase()] || "#897c83"}"></i>
        <span>${escapeHtml(label)}</span><strong>${number(distribution[label], 0)}</strong>
      </span>`).join("");
    const splitCount = Number(metrics.n_splits || 0);
    return `<section class="dataset-overview" aria-label="Informasi dataset">
      <div class="dataset-stat"><span>Jumlah data</span><strong>${number(metrics.jumlah_data, 0)}</strong><small>ulasan berlabel</small></div>
      <div class="dataset-stat"><span>Validasi</span><strong>Stratified K-Fold</strong><small>${splitCount ? `${splitCount} fold` : "Jumlah fold tidak tersedia"}</small></div>
      <div class="dataset-stat"><span>Pelatihan terakhir</span><strong class="dataset-date">${escapeHtml(formatTrainingDate(metrics.waktu_latih?.selesai))}</strong><small>${metrics.waktu_latih?.durasi_total_detik == null ? "" : `${number(metrics.waktu_latih.durasi_total_detik, 2)} detik`}</small></div>
      <div class="dataset-distribution"><span class="dataset-label">Distribusi kelas</span><div class="class-chip-list">${distributionMarkup || '<span class="muted-caption">Distribusi kelas tidak tersedia.</span>'}</div></div>
      <ul class="dataset-notes">${notes.join("")}</ul>
    </section>`;
  }

  function modelScoreTable(metrics) {
    const models = metrics.metrik_model || {};
    const best = metrics.model_terbaik_macro_f1;
    const entries = Object.entries(models);
    const rows = entries.map(([name, model]) => {
      const isBest = name === best;
      const accuracy = model.accuracy || {};
      return `<tr class="${isBest ? "best-model" : ""}">
        <th scope="row"><span class="model-name"><i class="model-dot" style="background:${MODEL_COLORS[name] || "#8b7f86"}"></i>${escapeHtml(MODEL_LABELS[name] || name)}</span>${isBest ? '<span class="best-badge">Terbaik</span>' : ""}</th>
        <td>${percent(accuracy.mean)} <span class="metric-uncertainty">± ${percent(accuracy.std)}</span></td>
        <td>${percent(metricValue(model, "precision"))}</td>
        <td>${percent(metricValue(model, "recall"))}</td>
        <td>${percent(metricValue(model, "f1"))}</td>
        <td>${percent(metricValue(model, "macro_f1"))}</td>
      </tr>`;
    }).join("");
    return `<div class="table-scroll"><table class="metrics-table">
      <caption class="sr-only">Perbandingan metrik evaluasi setiap model</caption>
      <thead><tr><th scope="col">Model</th><th scope="col">Akurasi<br /><small>mean ± std</small></th><th scope="col">Precision</th><th scope="col">Recall</th><th scope="col">F1</th><th scope="col">Macro F1</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6">Metrik model belum tersedia.</td></tr>'}</tbody>
    </table></div>`;
  }

  function confusionMatrix(name, matrix, labels) {
    const safeMatrix = Array.isArray(matrix) ? matrix : [];
    const max = Math.max(1, ...safeMatrix.flat().map(Number));
    const header = labels.map((label) => `<th scope="col">${escapeHtml(label)}</th>`).join("");
    const rows = labels.map((actual, rowIndex) => {
      const cells = labels.map((predicted, columnIndex) => {
        const value = Number(safeMatrix[rowIndex]?.[columnIndex] || 0);
        const heat = Math.round((value / max) * 100);
        const opacity = (heat / 100 * 0.5).toFixed(2);
        const textColor = heat > 58 ? "#fff" : "#554751";
        return `<td><span class="heat-cell" style="background-color:rgba(166,77,106,${opacity});color:${textColor}" title="Aktual: ${escapeHtml(actual)} · Prediksi: ${escapeHtml(predicted)} · ${value} data">${number(value, 0)}</span></td>`;
      }).join("");
      return `<tr><th scope="row">${escapeHtml(actual)}</th>${cells}</tr>`;
    }).join("");
    return `<article class="card confusion-card">
      <div class="confusion-title"><h4>${escapeHtml(MODEL_LABELS[name] || name)}</h4><span class="chart-caption">${labels.length} kelas</span></div>
      <p class="matrix-axis-label">Aktual ↓ &nbsp;·&nbsp; Prediksi →</p>
      <div class="table-scroll"><table class="confusion-table" aria-label="Confusion matrix ${escapeHtml(MODEL_LABELS[name] || name)}">
        <thead><tr><th scope="col">Aktual / Prediksi</th>${header}</tr></thead><tbody>${rows}</tbody>
      </table></div>
      <p class="matrix-caption">Angka diagonal menunjukkan prediksi yang sesuai dengan label aktual.</p>
    </article>`;
  }

  function topWordCards(topWords) {
    if (!topWords || typeof topWords !== "object") return "";
    const cards = [];
    Object.entries(topWords).forEach(([modelName, byClass]) => {
      Object.entries(byClass || {}).forEach(([label, words]) => {
        const labelClass = String(label).toLowerCase();
        const entries = Array.isArray(words) ? words.slice(0, 10) : [];
        cards.push(`<article class="card word-card">
          <div class="word-card-title"><div><span class="eyebrow">${escapeHtml(MODEL_LABELS[modelName] || modelName)}</span><h4>${escapeHtml(label)}</h4></div>
            <span class="sentiment-badge ${["positif", "netral", "negatif"].includes(labelClass) ? labelClass : "netral"}">${entries.length} kata</span>
          </div>
          <ol class="top-word-list">${entries.map((item) => `<li><span>${escapeHtml(item.kata)}</span><small>${number(item.skor, 3)}</small></li>`).join("") || "<li>Belum ada kata tersedia.</li>"}</ol>
        </article>`);
      });
    });
    return cards.join("") || '<p class="empty-inline">Daftar kata teratas belum tersedia untuk model atau kelas ini.</p>';
  }

  function drawChart(container, metrics) {
    const canvas = container.querySelector("[data-metrics-chart]");
    if (!canvas || typeof Chart === "undefined") return;
    const existing = charts.get(container);
    if (existing) existing.destroy();
    const models = metrics.metrik_model || {};
    const names = Object.keys(models);
    const keys = ["accuracy", "precision", "recall", "f1", "macro_f1"];
    const labels = ["Akurasi", "Precision", "Recall", "F1", "Macro F1"];
    const instance = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: names.map((name) => ({
          label: MODEL_LABELS[name] || name,
          data: keys.map((key) => metricValue(models[name], key) * 100),
          backgroundColor: MODEL_COLORS[name] || "#897c83",
          borderRadius: 5,
          maxBarThickness: 26,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: "#766b72", font: { family: "Plus Jakarta Sans", size: 10 } } },
          y: { min: 0, max: 100, ticks: { stepSize: 20, color: "#92868d", callback: (value) => `${value}%`, font: { family: "Plus Jakarta Sans", size: 9 } }, grid: { color: "#f1eaed" } },
        },
        plugins: {
          legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 18, color: "#665a62", font: { family: "Plus Jakarta Sans", size: 10 } } },
          tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${number(context.raw, 1)}%` } },
        },
      },
    });
    charts.set(container, instance);
  }

  function renderDashboard(container, metrics, options = {}) {
    const labels = Array.isArray(metrics.daftar_label)
      ? metrics.daftar_label
      : Object.keys(metrics.distribusi_kelas || {});
    const modelEntries = Object.entries(metrics.metrik_model || {});
    const confusion = modelEntries.map(([name, model]) => confusionMatrix(name, model.confusion_matrix, labels)).join("");
    container.innerHTML = `${renderDataset(metrics, Boolean(options.demoMode), options.smallThreshold || 100)}
      <section class="metric-compare-grid" aria-label="Tabel dan grafik perbandingan model">
        <article class="card metric-table-card"><div class="card-heading"><div><p class="eyebrow">HASIL VALIDASI</p><h3>Ringkasan metrik</h3></div><span class="chart-caption">Nilai dalam persen</span></div>
          ${modelScoreTable(metrics)}
          <p class="metric-footnote">Precision, recall, dan F1 menggunakan rata-rata berbobot kelas. Akurasi menampilkan mean ± standar deviasi antar-fold.</p>
        </article>
        <article class="card metric-chart-card"><div class="card-heading"><div><p class="eyebrow">PERBANDINGAN VISUAL</p><h3>Metrik per model</h3></div></div>
          <div class="metric-chart-wrap"><canvas data-metrics-chart role="img" aria-label="Diagram batang metrik akurasi, precision, recall, F1, dan macro F1 untuk setiap model"></canvas></div>
        </article>
      </section>
      <section class="confusion-section" aria-labelledby="confusionTitle"><div class="method-heading"><div><p class="eyebrow">BENAR DAN KELIRU</p><h3 id="confusionTitle">Confusion matrix</h3></div><span class="method-caption">Baris = aktual · kolom = prediksi</span></div>
        <div class="confusion-grid">${confusion || '<div class="empty-inline">Confusion matrix belum tersedia.</div>'}</div>
      </section>
      ${options.showTopWords === false ? "" : `<section class="top-words-section embedded-top-words"><div class="card-heading"><div><p class="eyebrow">POLA KATA DALAM DATA LATIH</p><h3>Kata teratas per model dan kelas</h3></div></div><div class="top-words-grid">${topWordCards(options.topWords)}</div></section>`}`;
    drawChart(container, metrics);
  }

  window.PeriMetrics = {
    renderDashboard,
    topWordCards,
    modelLabels: MODEL_LABELS,
  };
})();
