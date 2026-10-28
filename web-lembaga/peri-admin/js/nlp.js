// ============================================================
// Modul NLP Bahasa Indonesia (tanpa library / tanpa backend)
// Tahapan: case folding -> tokenisasi -> normalisasi kata gaul
//          -> stopword removal -> stemming ringan
// Analisis: sentimen (lexicon + negasi + penguat + kata kontras),
//           topik (skor kata kunci), jenis pesan, kata kunci (TF).
// ============================================================
(function (root) {
  "use strict";

  // ---------- Kamus normalisasi (kata gaul/singkatan -> baku) ----------
  const SLANG = {
    bgt: "banget",
    bngt: "banget",
    gak: "tidak",
    nggak: "tidak",
    ga: "tidak",
    gk: "tidak",
    tdk: "tidak",
    enggak: "tidak",
    engga: "tidak",
    ngga: "tidak",
    nda: "tidak",
    tak: "tidak",
    yg: "yang",
    dgn: "dengan",
    dg: "dengan",
    utk: "untuk",
    untk: "untuk",
    buat: "untuk",
    krn: "karena",
    karna: "karena",
    sy: "saya",
    aku: "saya",
    gue: "saya",
    gw: "saya",
    trims: "terima kasih",
    thanks: "terima kasih",
    thx: "terima kasih",
    makasih: "terima kasih",
    mksh: "terima kasih",
    terimakasih: "terima kasih",
    tks: "terima kasih",
    udh: "sudah",
    udah: "sudah",
    sdh: "sudah",
    blm: "belum",
    belom: "belum",
    lg: "lagi",
    jd: "jadi",
    jdi: "jadi",
    sm: "sama",
    tp: "tapi",
    tapi: "tapi",
    dr: "dari",
    dlm: "dalam",
    pd: "pada",
    spt: "seperti",
    bs: "bisa",
    bisa: "bisa",
    kpn: "kapan",
    gmn: "bagaimana",
    gimana: "bagaimana",
    knp: "kenapa",
    kok: "kok",
    mantul: "mantap",
    bagus: "bagus",
    oke: "baik",
    ok: "baik",
    jg: "juga",
    aja: "saja",
    doang: "saja",
    emg: "memang",
    org: "orang",
    bnyk: "banyak",
    skrg: "sekarang",
    sllu: "selalu",
    slalu: "selalu",
    lemot: "lambat",
    error: "error",
    eror: "error",
    lelet: "lambat",
    web: "website",
    situs: "website",
    pelatihan: "pelatihan",
    workshop: "pelatihan",
    webinar: "pelatihan",
  };

  const STOPWORDS = new Set(
    (
      "yang dan di ke dari untuk dengan pada dalam ini itu atau saya kami kita kamu anda dia mereka " +
      "adalah ada akan juga saja sudah telah sedang lagi masih sangat sekali agar supaya karena " +
      "sebagai oleh para bagi dapat bisa harus mungkin kalau jika bila saat ketika sebuah suatu " +
      "nya lah kah pun kok sih deh dong ya yah nih tuh mohon tolong silakan semoga mau ingin " +
      "apa siapa kapan dimana mana bagaimana kenapa berapa apakah"
    ).split(/\s+/),
  );

  // Kata negasi & kontras & penguat
  const NEGATORS = new Set([
    "tidak",
    "bukan",
    "belum",
    "kurang",
    "jangan",
    "tanpa",
    "nihil",
  ]);
  const INTENSIFIERS = {
    banget: 1.5,
    sangat: 1.5,
    sekali: 1.5,
    amat: 1.5,
    terlalu: 1.4,
    super: 1.5,
    paling: 1.4,
  };
  const CONTRAST = new Set(["tapi", "namun", "tetapi", "sayangnya", "hanya"]);

  // ---------- Lexicon sentimen (kata dasar, setelah stemming/normalisasi) ----------
  const POS = {};
  (
    "senang bagus baik bermanfaat manfaat membantu bantu bantuan mantap hebat keren puas puasan " +
    "ramah cepat mudah jelas lengkap inspirasi inspiratif menginspirasi semangat " +
    "luar biasa terbaik sukses lancar nyaman bahagia syukur bersyukur hormat apresiasi " +
    "profesional menarik berkesan sempurna rapi tertib antusias positif seru"
  )
    .split(/\s+/)
    .forEach((w) => (POS[w] = 1));
  ["terima kasih", "makasih"].forEach((w) => (POS[w] = 1));
  POS["terima kasih"] = 1;
  const NEG = {};
  (
    "kecewa buruk jelek lambat lama susah sulit ribet rumit bingung error rusak gagal masalah " +
    "keluhan komplain mengeluh mahal kotor berisik telat terlambat batal ditunda berantakan " +
    "tidak jelas kurang parah sayang menyulitkan mengecewakan lemot macet hilang salah " +
    "bohong lelah capek sedih marah kesal"
  )
    .split(/\s+/)
    .forEach((w) => (NEG[w] = 1));
  NEG["belum"] = 0.8;
  NEG["kecewa"] = 1.5;
  NEG["parah"] = 1.5;
  NEG["mengecewakan"] = 1.5;
  NEG["marah"] = 1.5;

  // ---------- Topik ----------
  const TOPICS = {
    "Program & Pelatihan": [
      "program",
      "pelatihan",
      "kelas",
      "materi",
      "mentor",
      "instruktur",
      "narasumber",
      "akademi",
      "digital",
      "bisnis",
      "inkubator",
      "kegiatan",
      "peserta",
      "sertifikat",
      "bangkit",
      "berdaya",
      "pendampingan",
      "umkm",
      "usaha",
    ],
    "Pendaftaran & Jadwal": [
      "daftar",
      "pendaftaran",
      "jadwal",
      "kuota",
      "syarat",
      "biaya",
      "gelombang",
      "periode",
      "kapan",
      "buka",
      "tutup",
      "wilayah",
      "lokasi",
      "tempat",
      "tanggal",
      "pengingat",
    ],
    "Website & Sistem": [
      "website",
      "situs",
      "halaman",
      "tombol",
      "login",
      "masuk",
      "akun",
      "fitur",
      "tampilan",
      "error",
      "lambat",
      "loading",
      "aplikasi",
      "formulir",
      "form",
      "email",
      "notifikasi",
    ],
    "Layanan & Pendampingan": [
      "layanan",
      "admin",
      "tim",
      "pelayanan",
      "respon",
      "balasan",
      "hubungi",
      "konsultasi",
      "ramah",
      "pengurus",
      "relawan",
      "bantuan",
      "bantu",
    ],
    "Kolaborasi & Kemitraan": [
      "kolaborasi",
      "kerjasama",
      "kerja",
      "mitra",
      "kemitraan",
      "sponsor",
      "donasi",
      "dukungan",
      "komunitas",
      "gabung",
      "relawan",
      "organisasi",
    ],
  };

  // ---------- Util ----------
  function caseFold(t) {
    return String(t || "").toLowerCase();
  }

  function tokenize(t) {
    return caseFold(t)
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/[^a-z0-9\s'-]/g, " ")
      .replace(/-/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  }

  function normalize(tokens) {
    const out = [];
    tokens.forEach((tk) => {
      const r = SLANG[tk] || tk;
      r.split(" ").forEach((p) => out.push(p));
    });
    // gabungkan "terima kasih"
    const merged = [];
    for (let i = 0; i < out.length; i++) {
      if (out[i] === "terima" && out[i + 1] === "kasih") {
        merged.push("terima kasih");
        i++;
      } else if (out[i] === "kerja" && out[i + 1] === "sama") {
        merged.push("kerjasama");
        i++;
      } else if (out[i] === "luar" && out[i + 1] === "biasa") {
        merged.push("luar biasa");
        i++;
      } else merged.push(out[i]);
    }
    return merged;
  }

  // Stemmer ringan: buang imbuhan umum. Hanya jika sisa >= 4 huruf.
  function stem(w) {
    if (w.length <= 4 || /\d/.test(w) || w.indexOf(" ") >= 0) return w;
    let s = w;
    s = s.replace(/(nya|lah|kah|pun)$/, "");
    s = s.replace(/(kan|an|i)$/, (m) => (s.length - m.length >= 4 ? "" : m));
    s = s.replace(
      /^(meng|meny|mem|men|me|peng|peny|pem|pen|ber|ter|per|di|ke|se)/,
      (m) => (s.length - m.length >= 4 ? "" : m),
    );
    return s;
  }

  function preprocess(text) {
    const tokens = normalize(tokenize(text));
    const noStop = tokens.filter(
      (t) => !STOPWORDS.has(t) || NEGATORS.has(t) || CONTRAST.has(t),
    );
    return { tokens: tokens, filtered: noStop, stems: noStop.map(stem) };
  }

  function lookup(dict, tok) {
    if (dict[tok]) return dict[tok];
    const s = stem(tok);
    return dict[s] || 0;
  }

  // ---------- Sentimen ----------
  function sentiment(text) {
    const toks = normalize(tokenize(text));
    // pecah di kata kontras: klausa setelahnya berbobot lebih besar
    let clauses = [[]];
    toks.forEach((t) => {
      if (CONTRAST.has(t)) clauses.push([]);
      else clauses[clauses.length - 1].push(t);
    });
    let total = 0,
      hits = [];
    clauses.forEach((cl, ci) => {
      const weight = clauses.length > 1 && ci > 0 ? 2 : 1;
      cl.forEach((tok, i) => {
        let v = lookup(POS, tok)
          ? 1
          : lookup(NEG, tok)
            ? -(NEG[tok] || NEG[stem(tok)] || 1)
            : 0;
        if (!v) return;
        // negasi dalam jendela 2 kata sebelumnya
        let negated = false,
          mult = 1;
        for (let k = Math.max(0, i - 2); k < i; k++) {
          if (NEGATORS.has(cl[k])) negated = true;
          if (INTENSIFIERS[cl[k]]) mult = INTENSIFIERS[cl[k]];
        }
        if (i + 1 < cl.length && INTENSIFIERS[cl[i + 1]])
          mult = INTENSIFIERS[cl[i + 1]];
        if (negated) v = -v * 0.8;
        v = v * mult * weight;
        total += v;
        hits.push({ kata: tok, nilai: Math.round(v * 100) / 100 });
      });
    });
    const label =
      total >= 0.75 ? "positif" : total <= -0.75 ? "negatif" : "netral";
    return { skor: Math.round(total * 100) / 100, label: label, kata: hits };
  }

  // ---------- Jenis pesan ----------
  function messageType(text) {
    const raw = caseFold(text);
    const toks = normalize(tokenize(text));
    const has = (re) => re.test(raw);
    const sent = sentiment(text);
    if (
      raw.indexOf("?") >= 0 ||
      /\b(apakah|bagaimana|kapan|dimana|berapa|siapa|bolehkah|mohon info|minta info|info)\b/.test(
        raw,
      ) ||
      toks[0] === "bagaimana"
    )
      return "Pertanyaan";
    if (
      has(
        /\b(sebaiknya|mungkin bisa|bisa ditambah|tolong ditambah|usul|saran|alangkah|diharapkan|sebaiknya|ditingkatkan|tambahkan|perlu ditambah|mohon ditambah)\b/,
      )
    )
      return "Saran";
    if (sent.label === "negatif") return "Keluhan";
    if (sent.label === "positif") return "Apresiasi";
    return "Lainnya";
  }

  // ---------- Topik ----------
  function topic(text) {
    const stems = preprocess(text).filtered.map(stem);
    let best = "Lainnya",
      bestScore = 0;
    Object.keys(TOPICS).forEach((name) => {
      const kw = TOPICS[name].map(stem);
      let sc = 0;
      stems.forEach((s) => {
        if (kw.indexOf(s) >= 0) sc++;
      });
      if (sc > bestScore) {
        bestScore = sc;
        best = name;
      }
    });
    return best;
  }

  // ---------- Kata kunci (frekuensi) ----------
  const GENERIC = new Set([
    "peri",
    "terima kasih",
    "baik",
    "bagus",
    "website",
    "luar biasa",
  ]);
  function keywords(texts) {
    const freq = {},
      surf = {};
    texts.forEach((t) => {
      const seen = {};
      preprocess(t).filtered.forEach((w) => {
        if (
          w.length < 4 ||
          NEGATORS.has(w) ||
          CONTRAST.has(w) ||
          INTENSIFIERS[w] ||
          GENERIC.has(w) ||
          /\d/.test(w)
        )
          return;
        const s = stem(w);
        if (s.length < 3 || seen[s]) return;
        seen[s] = 1; // hitung per dokumen
        freq[s] = (freq[s] || 0) + 1;
        (surf[s] = surf[s] || {})[w] = (surf[s][w] || 0) + 1;
      });
    });
    const show = (k) =>
      Object.keys(surf[k]).sort(
        (a, b) => surf[k][b] - surf[k][a] || a.length - b.length,
      )[0];
    return Object.keys(freq)
      .map((k) => ({ kata: show(k), jumlah: freq[k] }))
      .sort((a, b) => b.jumlah - a.jumlah || a.kata.localeCompare(b.kata));
  }

  function analyze(text) {
    const s = sentiment(text);
    return {
      sentimen: s.label,
      skor: s.skor,
      kataSentimen: s.kata,
      topik: topic(text),
      jenis: messageType(text),
    };
  }

  function summarize(messages) {
    const count = (arr, key) =>
      arr.reduce((o, a) => ((o[a[key]] = (o[a[key]] || 0) + 1), o), {});
    const res = messages.map((m) => analyze(m.pesan));
    return {
      total: messages.length,
      sentimen: count(res, "sentimen"),
      topik: count(res, "topik"),
      jenis: count(res, "jenis"),
      keywords: keywords(messages.map((m) => m.pesan)),
    };
  }

  const api = {
    preprocess,
    sentiment,
    topic,
    messageType,
    keywords,
    analyze,
    summarize,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.NLP = api;
})(typeof window !== "undefined" ? window : this);
