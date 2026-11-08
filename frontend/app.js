(() => {
  "use strict";

  const API_BASE = "/api";
  const LABELS = ["positif", "netral", "negatif"];
  const MODEL_NAMES = { ensemble: "Ensemble", nb: "Naive Bayes", svm: "SVM" };
  const MODEL_FIELDS = {
    nb: ["pred_nb", "proba_nb"],
    svm: ["pred_svm", "proba_svm"],
    ensemble: ["pred_ensemble", "proba_ensemble"],
  };
  const COLORS = { positif: "#167c70", netral: "#d7953f", negatif: "#b4454f" };
  const ASPECT_LABELS = {
    fasilitas: "Fasilitas",
    pengajar: "Pengajar",
    materi: "Materi",
    pelaksanaan: "Pelaksanaan",
    pelayanan: "Pelayanan",
    manfaat: "Manfaat",
  };
  const $ = (selector) => document.querySelector(selector);
  const state = {
    aspects: [],
    programs: [],
    model: "ensemble",
    overview: null,
    detail: null,
    selectedProgram: "",
    reviews: [],
    offset: 0,
    hasMore: false,
    loadingMore: false,
    charts: { radar: null, donut: null, trend: null, minis: [] },
    explanations: new Map(),
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  }

  async function fetchJson(url, options = {}) {
    let response;
    try {
      response = await fetch(url, options);
    } catch (error) {
      throw new Error("Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.");
    }
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("Server mengirim respons yang bukan JSON valid.");
    }
    if (!response.ok) {
      throw new Error(result.detail || "Permintaan ke server gagal.");
    }
    return result;
  }

  function showNotice(element, message, type = "success") {
    element.textContent = message;
    element.className = `notice${type === "error" ? " error" : type === "info" ? " info" : ""}`;
    element.classList.remove("hidden");
  }

  function clearNotice(element) {
    element.textContent = "";
    element.classList.add("hidden");
  }

  function sentimentName(label) {
    return LABELS.includes(String(label).toLowerCase()) ? String(label).toLowerCase() : "netral";
  }

  function sentimentLabel(label) {
    const normalized = sentimentName(label);
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  function getPercent(distribution, label) {
    return Number(distribution?.[label]?.persen || 0);
  }

  function renderKpis(overview) {
    const positive = getPercent(overview.distribusi_sentimen, "positif");
    const rating = overview.rata_rata_rating;
    const kpis = [
      { label: "Total ulasan", value: Number(overview.total_ulasan).toLocaleString("id-ID"), sub: "Suara yang telah dibagikan", tint: "#f7e9ed" },
      { label: "Sentimen positif", value: `${positive.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`, sub: `Berdasarkan model ${MODEL_NAMES[state.model]}`, tint: "#e5f3ee" },
      { label: "Rata-rata rating", value: rating == null ? "—" : `${Number(rating).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}<small>/5</small>`, sub: "Dari seluruh aspek layanan", tint: "#fff1df" },
    ];
    $("#kpiGrid").innerHTML = kpis.map((item) => `
      <article class="kpi-card" style="--kpi-tint:${item.tint}">
        <div class="kpi-label">${item.label}</div>
        <div class="kpi-value">${item.value}</div>
        <div class="kpi-sub">${item.sub}</div>
      </article>`).join("");
    $("#kpiGrid").classList.remove("hidden");
    $("#overviewLoading").classList.add("hidden");
    $("#overviewEmpty").classList.toggle("hidden", overview.total_ulasan !== 0);
    $("#programCount").textContent = `${overview.program.length} program`;
    renderProgramCards(overview.program);
  }

  function renderProgramCards(programs) {
    const container = $("#programCards");
    state.charts.minis.forEach((chart) => chart.destroy());
    state.charts.minis = [];
    container.innerHTML = programs.map((program, index) => `
      <button class="program-card" type="button" data-program-id="${Number(program.id)}" aria-label="Lihat detail ${escapeHtml(program.nama)}">
        <canvas id="miniChart${index}" class="mini-donut" role="img" aria-label="Distribusi sentimen ${escapeHtml(program.nama)}"></canvas>
        <span class="program-info">
          <span class="program-name">${escapeHtml(program.nama)}</span>
          <span class="program-stats">
            <span><strong>${program.rata_rata_rating == null ? "—" : Number(program.rata_rata_rating).toFixed(1)}</strong> ★</span>
            <span><strong>${Number(program.total_ulasan).toLocaleString("id-ID")}</strong> ulasan</span>
          </span>
        </span>
      </button>`).join("");

    programs.forEach((program, index) => {
      const canvas = $(`#miniChart${index}`);
      if (!canvas) return;
      state.charts.minis.push(new Chart(canvas, {
        type: "doughnut",
        data: {
          labels: LABELS.map(sentimentLabel),
          datasets: [{
            data: LABELS.map((label) => Number(program.distribusi_sentimen?.[label]?.jumlah || 0)),
            backgroundColor: LABELS.map((label) => COLORS[label]),
            borderWidth: 0,
            hoverOffset: 3,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          cutout: "73%",
          plugins: { legend: { display: false }, tooltip: { enabled: true } },
        },
      }));
    });
  }

  function setTab(tabName) {
    document.querySelectorAll(".tab").forEach((tab) => {
      const selected = tab.dataset.tab === tabName;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-current", selected ? "page" : "false");
    });
    document.querySelectorAll(".panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `${tabName}Panel`);
    });
    if (tabName === "detail" && state.selectedProgram && !state.detail) {
      loadProgramDetail(state.selectedProgram);
    }
  }

  function configureAspects(aspects) {
    state.aspects = aspects;
    const options = aspects.map((aspect) => `<option value="${escapeHtml(aspect)}">${escapeHtml(ASPECT_LABELS[aspect] || aspect)}</option>`).join("");
    $("#aspekTerkait").insertAdjacentHTML("beforeend", options);
    $("#aspectFilter").insertAdjacentHTML("beforeend", options);
    $("#ratingFields").innerHTML = aspects.map((aspect) => `
      <fieldset class="rating-control">
        <legend class="rating-control-label">${escapeHtml(ASPECT_LABELS[aspect] || aspect)}</legend>
        <div class="stars" role="radiogroup" aria-label="Rating ${escapeHtml(ASPECT_LABELS[aspect] || aspect)}">
          ${[1, 2, 3, 4, 5].map((rating) => {
            const id = `rating-${aspect}-${rating}`;
            return `<input class="star-radio sr-only" type="radio" id="${id}" name="${escapeHtml(aspect)}" value="${rating}" ${rating === 1 ? "required" : ""}>
              <label class="star-button" for="${id}" aria-label="${rating} dari 5 bintang">★</label>`;
          }).join("")}
          <span class="star-value" aria-live="polite">Pilih</span>
        </div>
      </fieldset>`).join("");
  }

  function renderPrograms(programs) {
    state.programs = programs;
    const detailSelect = $("#detailProgramSelect");
    const formSelect = $("#formProgramSelect");
    detailSelect.innerHTML = programs.map((program) => `<option value="${Number(program.id)}">${escapeHtml(program.nama)}</option>`).join("");
    formSelect.innerHTML = `<option value="">Pilih program</option>${programs.map((program) => `<option value="${Number(program.id)}">${escapeHtml(program.nama)}</option>`).join("")}`;
    if (!programs.length) {
      detailSelect.innerHTML = '<option value="">Belum ada program</option>';
      formSelect.innerHTML = '<option value="">Belum ada program</option>';
      $("#submitButton").disabled = true;
      return;
    }
    if (!state.selectedProgram || !programs.some((program) => String(program.id) === state.selectedProgram)) {
      state.selectedProgram = String(programs[0].id);
    }
    detailSelect.value = state.selectedProgram;
    formSelect.value = state.selectedProgram;
  }

  async function loadOverview() {
    $("#overviewLoading").classList.remove("hidden");
    $("#kpiGrid").classList.add("hidden");
    $("#overviewError").classList.add("hidden");
    try {
      const overview = await fetchJson(`${API_BASE}/overview?model=${encodeURIComponent(state.model)}`);
      state.overview = overview;
      renderKpis(overview);
    } catch (error) {
      $("#overviewLoading").classList.add("hidden");
      $("#overviewError").textContent = `Ringkasan tidak dapat dimuat: ${error.message}`;
      $("#overviewError").classList.remove("hidden");
    }
  }

  async function loadProgramDetail(programId, append = false) {
    if (!programId) return;
    state.selectedProgram = String(programId);
    $("#detailProgramSelect").value = state.selectedProgram;
    $("#formProgramSelect").value = state.selectedProgram;
    const loading = $("#detailLoading");
    const content = $("#detailContent");
    const errorBox = $("#detailError");
    const reviewLoading = $("#reviewsLoading");
    errorBox.classList.add("hidden");
    $("#reviewsError").classList.add("hidden");
    $("#reviewsEmpty").classList.add("hidden");
    if (!append) {
      loading.classList.remove("hidden");
      content.classList.add("hidden");
      reviewLoading.classList.remove("hidden");
      $("#reviewList").innerHTML = "";
      state.reviews = [];
      state.offset = 0;
      state.detail = null;
      $("#loadMoreButton").classList.add("hidden");
    } else {
      state.loadingMore = true;
      $("#loadMoreButton").disabled = true;
      $("#loadMoreButton").textContent = "Memuat...";
    }
    const requestedOffset = append ? state.offset : 0;
    try {
      const detail = await fetchJson(
        `${API_BASE}/program/${encodeURIComponent(programId)}/detail?model=${encodeURIComponent(state.model)}&limit=50&offset=${requestedOffset}`,
      );
      state.detail = detail;
      state.offset = requestedOffset + detail.ulasan.length;
      state.hasMore = state.offset < detail.total_ulasan;
      state.reviews = append ? state.reviews.concat(detail.ulasan) : detail.ulasan;
      $("#detailTitle").textContent = detail.program.nama;
      $("#detailDescription").textContent = `${detail.total_ulasan} ulasan · ${detail.program.deskripsi}`;
      drawCharts(detail);
      renderInsights(detail);
      renderReviews();
      loading.classList.add("hidden");
      content.classList.remove("hidden");
      reviewLoading.classList.add("hidden");
      $("#loadMoreButton").classList.toggle("hidden", !state.hasMore);
      $("#loadMoreButton").disabled = false;
      $("#loadMoreButton").textContent = "Muat lebih banyak";
      state.loadingMore = false;
    } catch (error) {
      loading.classList.add("hidden");
      reviewLoading.classList.add("hidden");
      if (append) {
        $("#reviewsError").textContent = `Komentar tidak dapat dimuat: ${error.message}`;
        $("#reviewsError").classList.remove("hidden");
        $("#loadMoreButton").disabled = false;
        $("#loadMoreButton").textContent = "Coba lagi";
      } else {
        content.classList.add("hidden");
        errorBox.textContent = `Detail program tidak dapat dimuat: ${error.message}`;
        errorBox.classList.remove("hidden");
      }
      state.loadingMore = false;
    }
  }

  function drawCharts(detail) {
    const labels = state.aspects.map((aspect) => ASPECT_LABELS[aspect] || aspect);
    const ratingValues = state.aspects.map((aspect) => detail.rata_rata_aspek?.[aspect] == null ? null : Number(detail.rata_rata_aspek[aspect]));
    const positiveValues = state.aspects.map((aspect) => detail.persen_positif_per_aspek?.[aspect] == null ? null : Number(detail.persen_positif_per_aspek[aspect]));
    const normalizedPositive = positiveValues.map((value) => value == null ? null : value / 20);
    const radarDatasets = [
      {
        label: "Rata-rata rating",
        data: ratingValues,
        rawValues: ratingValues,
        rawSuffix: "/5",
        backgroundColor: "rgba(166, 77, 106, .12)",
        borderColor: "#a64d6a",
        pointBackgroundColor: "#a64d6a",
        pointRadius: 3,
        borderWidth: 2,
      },
      {
        label: "Sentimen positif",
        data: normalizedPositive,
        rawValues: positiveValues,
        rawSuffix: "%",
        backgroundColor: "rgba(22, 124, 112, .10)",
        borderColor: "#167c70",
        pointBackgroundColor: "#167c70",
        pointRadius: 3,
        borderWidth: 2,
      },
    ];
    const radarOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: { r: { min: 0, max: 5, beginAtZero: true, ticks: { stepSize: 1, backdropColor: "transparent", color: "#92868d", font: { size: 9 } }, grid: { color: "#efe7ea" }, angleLines: { color: "#efe7ea" }, pointLabels: { color: "#655962", font: { family: "Plus Jakarta Sans", size: 10 } } } },
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 7, boxHeight: 7, padding: 17, color: "#665a62", font: { family: "Plus Jakarta Sans", size: 10 } } },
        tooltip: { callbacks: { label(context) {
          const dataset = context.dataset;
          const raw = dataset.rawValues[context.dataIndex];
          return `${dataset.label}: ${raw == null ? "Belum ada data" : `${Number(raw).toLocaleString("id-ID", { maximumFractionDigits: 1 })}${dataset.rawSuffix}`}`;
        } } },
      },
    };
    if (state.charts.radar) {
      state.charts.radar.data.labels = labels;
      state.charts.radar.data.datasets = radarDatasets;
      state.charts.radar.update();
    } else {
      state.charts.radar = new Chart($("#radarChart"), { type: "radar", data: { labels, datasets: radarDatasets }, options: radarOptions });
    }

    const distributionValues = LABELS.map((label) => Number(detail.distribusi_sentimen?.[label]?.jumlah || 0));
    const donutData = {
      labels: LABELS.map(sentimentLabel),
      datasets: [{ data: distributionValues, backgroundColor: LABELS.map((label) => COLORS[label]), borderWidth: 0, hoverOffset: 4 }],
    };
    const donutOptions = {
      responsive: true, maintainAspectRatio: false, cutout: "73%",
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label(context) {
          const label = LABELS[context.dataIndex];
          const percentage = detail.distribusi_sentimen?.[label]?.persen || 0;
          return `${sentimentLabel(label)}: ${context.raw} (${Number(percentage).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%)`;
        } } },
      },
    };
    if (state.charts.donut) {
      state.charts.donut.data = donutData;
      state.charts.donut.options = donutOptions;
      state.charts.donut.update();
    } else {
      state.charts.donut = new Chart($("#detailDonut"), { type: "doughnut", data: donutData, options: donutOptions });
    }
    $("#detailLegend").innerHTML = LABELS.map((label, index) => `
      <span class="legend-item"><i class="legend-dot" style="background:${COLORS[label]}"></i>
        ${sentimentLabel(label)} <strong>${Number(detail.distribusi_sentimen?.[label]?.persen || 0).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</strong>
      </span>`).join("");

    const trend = detail.tren_bulanan || [];
    const trendData = {
      labels: trend.map((item) => {
        const [year, month] = item.bulan.split("-");
        return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
      }),
      datasets: LABELS.map((label) => ({
        label: sentimentLabel(label),
        data: trend.map((item) => Number(item.distribusi_sentimen?.[label] || 0)),
        borderColor: COLORS[label],
        backgroundColor: COLORS[label],
        tension: .35,
        pointRadius: 3,
        borderWidth: 2,
      })),
    };
    const trendOptions = {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 7, boxHeight: 7, padding: 17, color: "#665a62", font: { family: "Plus Jakarta Sans", size: 10 } } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#92868d", font: { family: "Plus Jakarta Sans", size: 9 } } },
        y: { beginAtZero: true, ticks: { precision: 0, color: "#92868d", font: { family: "Plus Jakarta Sans", size: 9 } }, grid: { color: "#f1eaed" } },
      },
    };
    if (state.charts.trend) {
      state.charts.trend.data = trendData;
      state.charts.trend.options = trendOptions;
      state.charts.trend.update();
    } else {
      state.charts.trend = new Chart($("#trendChart"), { type: "line", data: trendData, options: trendOptions });
    }
  }

  function renderInsights(detail) {
    const ratings = state.aspects
      .map((aspect) => ({ aspect, value: detail.rata_rata_aspek?.[aspect] }))
      .filter((item) => item.value != null);
    const negatives = state.aspects
      .map((aspect) => ({ aspect, value: detail.persen_negatif_per_aspek?.[aspect] }))
      .filter((item) => item.value != null);
    const lowest = ratings.sort((a, b) => Number(a.value) - Number(b.value))[0];
    const mostNegative = negatives.sort((a, b) => Number(b.value) - Number(a.value))[0];
    const insights = [];
    if (lowest) {
      insights.push(`<li class="insight-item"><span class="insight-marker" aria-hidden="true">↓</span><span>Rating terendah ada pada <strong>${escapeHtml(ASPECT_LABELS[lowest.aspect] || lowest.aspect)}</strong> (${Number(lowest.value).toLocaleString("id-ID", { maximumFractionDigits: 2 })}/5). Aspek ini dapat menjadi ruang perhatian berikutnya.</span></li>`);
    }
    if (mostNegative) {
      insights.push(`<li class="insight-item"><span class="insight-marker" aria-hidden="true">♡</span><span>Sentimen negatif paling banyak terkait <strong>${escapeHtml(ASPECT_LABELS[mostNegative.aspect] || mostNegative.aspect)}</strong> (${Number(mostNegative.value).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%).</span></li>`);
    }
    if (!insights.length) {
      insights.push('<li class="insight-item"><span class="insight-marker" aria-hidden="true">✦</span><span>Insight akan muncul setelah tersedia ulasan dan rating aspek.</span></li>');
    }
    $("#insightList").innerHTML = insights.join("");
  }

  function currentSentiment(review) {
    const [predictionField] = MODEL_FIELDS[state.model];
    return review[predictionField];
  }

  function renderReviews() {
    const query = $("#searchFilter").value.trim().toLocaleLowerCase("id");
    const sentiment = $("#sentimentFilter").value;
    const aspect = $("#aspectFilter").value;
    const filtered = state.reviews.filter((review) => {
      const comment = `${review.nama_peserta} ${review.komentar}`.toLocaleLowerCase("id");
      return (!query || comment.includes(query))
        && (!sentiment || String(currentSentiment(review)).toLowerCase() === sentiment)
        && (!aspect || review.aspek_terkait === aspect);
    });
    $("#reviewCount").textContent = `${filtered.length}${filtered.length !== state.detail?.total_ulasan ? ` dari ${state.detail?.total_ulasan || 0}` : ""} komentar`;
    $("#reviewsEmpty").classList.toggle("hidden", filtered.length !== 0);
    $("#reviewList").innerHTML = filtered.map(renderReview).join("");
    $("#loadMoreButton").classList.toggle("hidden", !state.hasMore || Boolean(query || sentiment || aspect));
  }

  function renderReview(review) {
    const sentiment = sentimentName(currentSentiment(review));
    const date = new Date(review.tanggal);
    const formattedDate = Number.isNaN(date.getTime()) ? "Tanggal tidak tersedia" : date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const modelRows = [
      ["nb", "Naive Bayes"],
      ["svm", "SVM"],
      ["ensemble", "Ensemble"],
    ].map(([model, label]) => {
      const [predictionField, probabilityField] = MODEL_FIELDS[model];
      const prediction = sentimentName(review[predictionField]);
      const probabilities = review[probabilityField] || {};
      const confidence = Math.max(0, Math.min(100, Number(probabilities[prediction] || 0) * 100));
      return `<div class="model-row" data-label="${prediction}">
        <strong>${label}</strong><span>${sentimentLabel(prediction)}</span>
        <span class="prob-track" aria-hidden="true"><span class="prob-fill" style="width:${confidence}%"></span></span>
        <span>${confidence.toFixed(0)}%</span>
      </div>`;
    }).join("");
    const aspectLabel = ASPECT_LABELS[review.aspek_terkait] || review.aspek_terkait;
    const explanation = state.explanations.get(`${review.id}:${state.model}`);
    const chips = explanation ? explanation.kata.map((word) => {
      const isNegative = Number(word.kontribusi) < 0;
      const title = `${isNegative ? "Negatif" : "Positif"} · kontribusi ${Number(word.kontribusi).toFixed(3)}`;
      return `<span class="word-chip${isNegative ? " negative" : ""}" title="${title}">${escapeHtml(word.kata)}</span>`;
    }).join("") || '<span class="word-chip">Tidak ada kata penentu</span>' : "";

    return `<article class="review-card" data-review-id="${Number(review.id)}">
      <div class="review-top">
        <div class="review-author">
          <span class="avatar" aria-hidden="true">${escapeHtml((review.nama_peserta || "?").trim().charAt(0).toUpperCase())}</span>
          <div><p class="review-name">${escapeHtml(review.nama_peserta)}</p><p class="review-date">${escapeHtml(formattedDate)}</p></div>
        </div>
        <div class="review-badges">
          ${review.model_berbeda ? '<span class="disagreement" title="Model tidak sepakat" aria-label="Model tidak sepakat">⚑</span>' : ""}
          <span class="sentiment-badge ${sentiment}">${sentimentLabel(sentiment)}</span>
          <span class="aspect-badge">${escapeHtml(aspectLabel)}</span>
        </div>
      </div>
      <p class="review-comment">${escapeHtml(review.komentar)}</p>
      <div class="model-breakdown" aria-label="Prediksi dan probabilitas dari setiap model">${modelRows}</div>
      <div class="explain-row">
        <button type="button" class="explain-button" data-explain-id="${Number(review.id)}" ${explanation ? "aria-expanded=\"true\"" : "aria-expanded=\"false\""}>Mengapa?</button>
        <div class="explanation" id="explanation-${Number(review.id)}">${chips}</div>
      </div>
    </article>`;
  }

  async function explainReview(reviewId, button) {
    const cacheKey = `${reviewId}:${state.model}`;
    if (state.explanations.has(cacheKey)) {
      state.explanations.delete(cacheKey);
      renderReviews();
      return;
    }
    button.disabled = true;
    button.textContent = "Menganalisis...";
    try {
      const result = await fetchJson(`${API_BASE}/ulasan/${encodeURIComponent(reviewId)}/explain?model=${encodeURIComponent(state.model)}`);
      state.explanations.set(cacheKey, result);
      renderReviews();
    } catch (error) {
      button.disabled = false;
      button.textContent = "Coba lagi";
      const card = button.closest(".review-card");
      let message = card.querySelector(".explain-error");
      if (!message) {
        message = document.createElement("span");
        message.className = "explain-error";
        message.style.color = "#963c46";
        message.style.fontSize = "10px";
        button.parentElement.append(message);
      }
      message.textContent = error.message;
    }
  }

  function updateStarDisplay(group) {
    const selected = Number(group.querySelector("input:checked")?.value || 0);
    group.querySelectorAll(".star-button").forEach((label) => {
      const rating = Number(label.htmlFor.split("-").pop());
      label.classList.toggle("selected", rating <= selected);
    });
    group.querySelector(".star-value").textContent = selected ? `${selected}/5` : "Pilih";
  }

  function showPredictions(result) {
    const names = { nb: "Naive Bayes", svm: "SVM", ensemble: "Ensemble" };
    const cards = Object.entries(names).map(([key, name]) => {
      const prediction = result.prediksi[key];
      const label = sentimentName(prediction.prediksi);
      const confidence = Number(prediction.probabilitas?.[label] || 0) * 100;
      return `<div class="prediction-card"><strong>${name}</strong>
        <span class="sentiment-badge ${label}">${sentimentLabel(label)}</span>
        <div class="prediction-confidence">Keyakinan ${confidence.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</div></div>`;
    }).join("");
    const container = $("#predictionResults");
    container.innerHTML = `<h3>Terima kasih sudah berbagi.</h3><p>Berikut gambaran analisis komentar dari ketiga model.</p><div class="prediction-grid">${cards}</div>`;
    container.classList.remove("hidden");
    container.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function submitReview(event) {
    event.preventDefault();
    const form = event.currentTarget;
    clearNotice($("#formNotice"));
    if (!form.reportValidity()) return;
    const formData = new FormData(form);
    const payload = {
      program_id: Number(formData.get("program_id")),
      nama_peserta: String(formData.get("nama_peserta")).trim(),
      komentar: String(formData.get("komentar")).trim(),
      aspek_terkait: formData.get("aspek_terkait"),
    };
    state.aspects.forEach((aspect) => {
      const rating = formData.get(aspect);
      if (rating == null) {
        showNotice($("#formNotice"), `Mohon pilih rating untuk aspek ${ASPECT_LABELS[aspect] || aspect}.`, "error");
        return;
      }
      payload[aspect] = Number(rating);
    });

    const button = $("#submitButton");
    button.disabled = true;
    button.innerHTML = "Mengirim evaluasi...";
    try {
      const result = await fetchJson(`${API_BASE}/ulasan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      showNotice($("#formNotice"), result.message || "Evaluasi berhasil dikirim. Terima kasih!", "success");
      form.reset();
      document.querySelectorAll(".stars").forEach(updateStarDisplay);
      showPredictions({
        prediksi: {
          nb: { prediksi: result.pred_nb, probabilitas: result.proba_nb },
          svm: { prediksi: result.pred_svm, probabilitas: result.proba_svm },
          ensemble: { prediksi: result.pred_ensemble, probabilitas: result.proba_ensemble },
        },
      });
      await Promise.all([loadOverview(), loadProgramDetail(state.selectedProgram)]);
    } catch (error) {
      if (!$("#formNotice").textContent) {
        showNotice($("#formNotice"), `Evaluasi tidak dapat dikirim: ${error.message}`, "error");
      }
    } finally {
      button.disabled = false;
      button.innerHTML = 'Kirim evaluasi <span aria-hidden="true">→</span>';
    }
  }

  async function initialize() {
    const notice = $("#globalNotice");
    try {
      const config = await fetchJson(`${API_BASE}/config`);
      configureAspects(config.aspects);
      $("#demoBadge").classList.toggle("hidden", !config.demo_mode);
      $("#submitDemoNote").classList.toggle("hidden", !config.demo_mode);
      const programs = await fetchJson(`${API_BASE}/program`);
      renderPrograms(programs);
      $("#submitButton").disabled = programs.length === 0;
      await Promise.all([loadOverview(), loadProgramDetail(state.selectedProgram)]);
      clearNotice(notice);
    } catch (error) {
      showNotice(notice, `Dashboard belum dapat dimuat: ${error.message}`, "error");
      $("#overviewLoading").classList.add("hidden");
      $("#overviewError").textContent = error.message;
      $("#overviewError").classList.remove("hidden");
    }
  }

  document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => setTab(tab.dataset.tab)));
  document.querySelectorAll("[data-open-tab]").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.openTab)));
  $("#overviewModel").addEventListener("change", async (event) => {
    state.model = event.target.value;
    state.explanations.clear();
    await Promise.all([loadOverview(), state.selectedProgram ? loadProgramDetail(state.selectedProgram) : Promise.resolve()]);
  });
  $("#detailProgramSelect").addEventListener("change", (event) => loadProgramDetail(event.target.value));
  $("#formProgramSelect").addEventListener("change", (event) => {
    if (event.target.value) {
      state.selectedProgram = event.target.value;
      $("#detailProgramSelect").value = state.selectedProgram;
    }
  });
  $("#programCards").addEventListener("click", (event) => {
    const card = event.target.closest("[data-program-id]");
    if (!card) return;
    state.selectedProgram = card.dataset.programId;
    $("#detailProgramSelect").value = state.selectedProgram;
    $("#formProgramSelect").value = state.selectedProgram;
    setTab("detail");
    loadProgramDetail(state.selectedProgram);
  });
  $("#searchFilter").addEventListener("input", renderReviews);
  $("#sentimentFilter").addEventListener("change", renderReviews);
  $("#aspectFilter").addEventListener("change", renderReviews);
  $("#reviewList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-explain-id]");
    if (button) explainReview(button.dataset.explainId, button);
  });
  $("#loadMoreButton").addEventListener("click", () => {
    if (!state.loadingMore && state.hasMore) loadProgramDetail(state.selectedProgram, true);
  });
  $("#ratingFields").addEventListener("change", (event) => {
    if (event.target.matches(".star-radio")) updateStarDisplay(event.target.closest(".stars"));
  });
  $("#reviewForm").addEventListener("submit", submitReview);

  initialize();
})();
