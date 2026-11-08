(() => {
  "use strict";

  const examples = {
    positive: "Pendampingnya sangat ramah, materi dijelaskan dengan jelas, dan pelatihan ini bermanfaat untuk usaha saya.",
    neutral: "Materinya cukup menarik, tetapi waktu praktik terasa kurang dan fasilitasnya biasa saja.",
    negative: "Saya tidak puas karena fasilitas kurang nyaman dan penjelasan belum cukup jelas.",
  };
  const modelNames = { nb: "Naive Bayes", svm: "SVM", ensemble: "Ensemble" };
  const colors = { positif: "#167c70", netral: "#d7953f", negatif: "#b4454f" };
  const stepNames = {
    case_folding: "Case folding",
    cleaning: "Cleaning",
    normalisasi_slang: "Normalisasi kata",
    stopword_removal: "Stopword removal",
    stemming: "Stemming",
  };
  const $ = (selector) => document.querySelector(selector);

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  }

  function normalizeLabel(value) {
    return String(value || "").toLowerCase();
  }

  function displayLabel(value) {
    const label = normalizeLabel(value);
    return label ? label.charAt(0).toUpperCase() + label.slice(1) : "Tidak tersedia";
  }

  function formatProbability(value) {
    const number = Math.max(0, Math.min(1, Number(value) || 0));
    return { percent: number * 100, text: `${(number * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%` };
  }

  function renderPreprocessing(result) {
    const stages = result.preprocessing || {};
    const before = result.komentar || "";
    const caseFolded = stages.case_folding || "";
    const cleaned = stages.cleaning || "";
    const normalized = stages.normalisasi_slang || "";
    const withoutStopwords = stages.stopword_removal || "";
    const stemmed = stages.stemming || "";
    const tokenized = normalized.split(/\s+/).filter(Boolean);
    const steps = [
      { title: "Case folding", before, after: caseFolded, description: "Menyeragamkan huruf menjadi huruf kecil." },
      { title: "Cleaning", before: caseFolded, after: cleaned, description: "Menghapus angka, tanda baca, dan spasi berlebih." },
      { title: "Normalisasi kata", before: cleaned, after: normalized, description: "Mengubah kata tidak baku menjadi bentuk yang dikenal." },
      { title: "Tokenizing", before: normalized, after: tokenized.length ? tokenized.join(" · ") : "(tidak ada token)", description: `${tokenized.length} token` },
      { title: "Stopword removal", before: normalized, after: withoutStopwords, description: "Menyaring kata umum tanpa membuang kata negasi." },
      { title: "Stemming", before: withoutStopwords, after: stemmed, description: "Mengubah kata ke bentuk dasarnya." },
    ];
    return `<section class="preprocessing-result" aria-label="Tahapan preprocessing">
      <div class="result-section-title"><div><p class="eyebrow">LANGKAH DEMI LANGKAH</p><h4>Bagaimana komentar diproses?</h4></div>
        <span class="result-step-count">${steps.length} tahap</span></div>
      <ol class="preprocessing-steps">${steps.map((step, index) => `
        <li class="preprocessing-step">
          <span class="step-number">${index + 1}</span>
          <div class="step-content"><div class="step-header"><strong>${step.title}</strong><span>${step.description}</span></div>
            <div class="step-values"><div><small>Sebelum</small><p>${escapeHtml(step.before || "(kosong)")}</p></div>
              <span class="step-transition" aria-hidden="true">→</span>
              <div><small>Sesudah</small><p>${escapeHtml(step.after || "(kosong)")}</p></div></div>
          </div>
        </li>`).join("")}</ol>
      <div class="final-text"><span>Teks yang dianalisis</span><strong>${escapeHtml(result.komentar_bersih || "(kosong)")}</strong></div>
    </section>`;
  }

  function renderModels(result) {
    return `<section class="analysis-model-section" aria-label="Hasil prediksi model">
      <div class="result-section-title"><div><p class="eyebrow">TIGA SUDUT PANDANG</p><h4>Hasil prediksi model</h4></div></div>
      <div class="analysis-model-grid">${Object.entries(modelNames).map(([key, name]) => {
        const prediction = result.prediksi?.[key];
        const label = normalizeLabel(prediction?.prediksi);
        const color = colors[label] || "#8b7f86";
        const probabilities = prediction?.probabilitas || {};
        const explanation = result.penjelasan?.[key]?.kata || [];
        return `<article class="card analysis-model-card">
          <div class="analysis-model-title"><strong>${name}</strong><span class="sentiment-badge ${["positif", "netral", "negatif"].includes(label) ? label : "netral"}">${displayLabel(label)}</span></div>
          <div class="probability-list" aria-label="Probabilitas sentimen ${name}">
            ${Object.entries(probabilities).map(([sentiment, value]) => {
              const normalized = normalizeLabel(sentiment);
              const score = formatProbability(value);
              return `<div class="analysis-prob-row">
                <span>${escapeHtml(displayLabel(sentiment))}</span>
                <span class="analysis-prob-track"><span style="width:${score.percent}%;--prob-color:${colors[normalized] || "#8b7f86"}"></span></span>
                <strong>${score.text}</strong>
              </div>`;
            }).join("") || '<p class="muted-caption">Probabilitas tidak tersedia.</p>'}
          </div>
          <div class="decision-words"><span>Kata penentu</span><div class="explanation">
            ${explanation.slice(0, 8).map((word) => {
              const contribution = Number(word.kontribusi);
              const negative = contribution < 0;
              return `<span class="word-chip${negative ? " negative" : ""}" title="Kontribusi ${contribution.toFixed(3)}">${escapeHtml(word.kata)}</span>`;
            }).join("") || '<span class="muted-caption">Tidak ada kata penentu.</span>'}
          </div></div>
          <span class="sr-only">Warna prediksi: ${escapeHtml(color)}</span>
        </article>`;
      }).join("")}</div>
      <p class="metric-footnote">Kata penentu membantu menjelaskan pola yang dipakai model; kata tersebut bukan bukti sebab-akibat.</p>
    </section>`;
  }

  async function analyze(event) {
    event.preventDefault();
    const input = $("#analysisText");
    const text = input.value.trim();
    $("#analysisError").classList.add("hidden");
    $("#analysisResults").classList.add("hidden");
    if (!text) {
      input.focus();
      input.reportValidity();
      return;
    }

    const button = $("#analysisButton");
    button.disabled = true;
    $("#analysisLoading").classList.remove("hidden");
    try {
      const response = await fetch("/api/analisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ komentar: text }),
      });
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error("Server mengirim respons yang bukan JSON valid.");
      }
      if (!response.ok) throw new Error(result.detail || "Komentar tidak dapat dianalisis.");
      $("#analysisResults").innerHTML = `${renderPreprocessing(result)}${renderModels(result)}`;
      $("#analysisResults").classList.remove("hidden");
    } catch (error) {
      $("#analysisError").textContent = `Analisis tidak dapat dilakukan: ${error.message}`;
      $("#analysisError").classList.remove("hidden");
    } finally {
      $("#analysisLoading").classList.add("hidden");
      button.disabled = false;
    }
  }

  document.querySelectorAll("[data-example]").forEach((button) => {
    button.addEventListener("click", () => {
      $("#analysisText").value = examples[button.dataset.example] || "";
      $("#analysisText").focus();
    });
  });
  $("#analysisForm").addEventListener("submit", analyze);
})();
