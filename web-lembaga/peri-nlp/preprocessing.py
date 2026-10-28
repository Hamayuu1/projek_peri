import re

SLANG = {"gak": "tidak", "nggak": "tidak", "ga": "tidak", "tdk": "tidak", "bgt": "banget",
         "yg": "yang", "dgn": "dengan", "utk": "untuk", "krn": "karena", "sy": "saya",
         "makasih": "terima kasih", "thanks": "terima kasih", "udah": "sudah", "blm": "belum",
         "bs": "bisa", "tp": "tapi", "mantul": "mantap"}
# Kata negasi sengaja TIDAK dibuang agar frasa seperti "tidak sesuai" tetap terbaca.
STOPWORDS = set("yang dan di ke dari untuk dengan pada dalam ini itu atau saya kami kita kamu "
                "anda dia mereka adalah ialah akan juga saja sudah lagi sangat para oleh itu "
                "agar supaya karena sebagai bahwa ada".split())
NEGATIONS = {"tidak", "bukan", "belum", "tanpa", "kurang"}

try:  # stemmer penuh jika PySastrawi terpasang
    from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
    _stem = StemmerFactory().create_stemmer().stem
    STEMMER_NAME = "sastrawi"
except Exception:
    STEMMER_NAME = "ringan"
    _SUFFIX = ("kan", "an", "i", "nya", "lah", "kah")
    _PREFIX = ("meng", "meny", "mem", "men", "me", "peng", "peny", "pem", "pen", "per", "ber", "ter", "di", "ke", "se")

    def _stem(w: str) -> str:
        if len(w) <= 4:
            return w
        for s in _SUFFIX:
            if w.endswith(s) and len(w) - len(s) >= 4:
                w = w[: -len(s)]
                break
        for p in _PREFIX:
            if w.startswith(p) and len(w) - len(p) >= 4:
                w = w[len(p):]
                break
        return w


def clean(text: str) -> str:
    text = text.lower()
    text = text.replace("?", " qmark ")  # tanda tanya = petunjuk kuat untuk kategori pertanyaan
    text = re.sub(r"https?://\S+|\S+@\S+", " ", text)
    text = re.sub(r"[^a-z\s]", " ", text)
    text = re.sub(r"(.)\1{2,}", r"\1\1", text)  # "bagusss" -> "baguss"
    return re.sub(r"\s+", " ", text).strip()


def preprocess(text: str) -> list[str]:
    tokens = []
    for t in clean(text).split():
        t = SLANG.get(t, t)
        for part in t.split():
            if part in STOPWORDS:
                continue
            tokens.append(part if part in NEGATIONS else _stem(part))
    return tokens


def bigram_analyzer(text: str) -> list[str]:
    """Unigram + bigram (menangkap frasa seperti 'tidak_sesuai'). Harus di modul ini agar model bisa dimuat ulang."""
    t = preprocess(text)
    return t + [a + "_" + b for a, b in zip(t, t[1:])]