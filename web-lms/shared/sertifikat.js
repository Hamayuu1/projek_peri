/* Sertifikat berbasis template gambar. Dipakai admin (pratinjau dan atur posisi nama) dan peserta (hasil akhir). */
(function () {
  'use strict';

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v, d, lo, hi) { v = parseFloat(v); return isNaN(v) ? d : Math.min(hi, Math.max(lo, v)); }

  /* nilai pengaturan yang aman, dengan bawaan jika kosong */
  function conf(t) {
    t = t || {};
    var w = +t.weight;
    return {
      x: num(t.x, 50, 0, 100),
      y: num(t.y, 55, 0, 100),
      size: num(t.size, 5, 1, 12),
      color: /^#[0-9a-f]{6}$/i.test(t.color) ? t.color : '#222222',
      weight: (w === 400 || w === 500 || w === 600) ? w : 600,
      caps: !!t.caps
    };
  }
  function teks(c, nama) { var s = String(nama == null ? '' : nama); return c.caps ? s.toUpperCase() : s; }
  function imgOk(t) { return !!(t && typeof t.img === 'string' && /^data:image\//.test(t.img)); }

  /* ukuran huruf memakai satuan cqw (persen lebar sertifikat) agar sama di layar kecil maupun besar */
  function html(t, nama) {
    var c = conf(t);
    if (!imgOk(t)) return '';
    return '<div class="certx" style="position:relative;width:100%;container-type:inline-size;line-height:0;background:#fff">' +
      '<img src="' + t.img + '" alt="Template sertifikat" draggable="false" style="display:block;width:100%;height:auto;user-select:none;-webkit-user-select:none">' +
      '<div class="certn" data-size="' + c.size + '" data-x="' + c.x + '" style="position:absolute;left:' + c.x + '%;top:' + c.y + '%;transform:translate(-50%,-50%);font-size:' + c.size + 'cqw;color:' + c.color + ';font-weight:' + c.weight + ';white-space:nowrap;line-height:1.2;pointer-events:none">' + esc(teks(c, nama)) + '</div></div>';
  }

  /* kecilkan huruf bila nama terlalu panjang untuk muat di dalam gambar */
  function fit(root) {
    if (!root) return;
    var list = root.querySelectorAll('.certn');
    for (var i = 0; i < list.length; i++) {
      var n = list[i], box = n.parentNode.clientWidth;
      if (!box) continue;
      var size = parseFloat(n.getAttribute('data-size')) || 5, x = parseFloat(n.getAttribute('data-x'));
      if (isNaN(x)) x = 50;
      n.style.fontSize = size + 'cqw';
      var avail = Math.max(box * 2 * Math.min(x, 100 - x) / 100 * 0.96, box * 0.2), w = n.scrollWidth;
      if (w > avail) n.style.fontSize = (size * avail / w) + 'cqw';
    }
  }

  /* perbarui sertifikat yang sudah tampil tanpa memuat ulang gambar */
  function apply(root, t, nama) {
    if (!root) return;
    var c = conf(t), n = root.querySelector('.certn');
    if (!n) return;
    n.style.left = c.x + '%'; n.style.top = c.y + '%';
    n.style.color = c.color; n.style.fontWeight = c.weight;
    n.setAttribute('data-size', c.size); n.setAttribute('data-x', c.x);
    n.textContent = teks(c, nama);
    fit(root);
  }

  /* unduh sebagai gambar PNG */
  function png(t, nama, fname) {
    if (!imgOk(t)) return;
    var c = conf(t), im = new Image();
    im.onload = function () {
      var cv = document.createElement('canvas'), g;
      cv.width = im.naturalWidth; cv.height = im.naturalHeight; g = cv.getContext('2d');
      function gambar() {
        g.drawImage(im, 0, 0);
        var s = c.size / 100 * cv.width, tx = teks(c, nama), fam = 'Poppins, sans-serif';
        g.font = c.weight + ' ' + s + 'px ' + fam;
        var w = g.measureText(tx).width, avail = Math.max(cv.width * 2 * Math.min(c.x, 100 - c.x) / 100 * 0.96, cv.width * 0.2);
        if (w > avail) { s = s * avail / w; g.font = c.weight + ' ' + s + 'px ' + fam; }
        g.fillStyle = c.color; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(tx, c.x / 100 * cv.width, c.y / 100 * cv.height);
        cv.toBlob(function (b) {
          if (!b) return;
          var a = document.createElement('a'), u = URL.createObjectURL(b);
          a.href = u; a.download = fname || 'sertifikat.png'; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
        }, 'image/png');
      }
      if (document.fonts && document.fonts.load) document.fonts.load(c.weight + ' 20px Poppins').then(gambar, gambar); else gambar();
    };
    im.src = t.img;
  }

  /* baca berkas gambar, kecilkan (maks 1600 px), jadikan JPEG supaya muat di penyimpanan browser */
  function prep(file, ok, gagal) {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { gagal('Gunakan gambar JPG, PNG, atau WebP.'); return; }
    if (file.size > 8 * 1024 * 1024) { gagal('Ukuran gambar maksimal 8 MB.'); return; }
    var fr = new FileReader();
    fr.onerror = function () { gagal('Gambar tidak bisa dibaca.'); };
    fr.onload = function () {
      var im = new Image();
      im.onerror = function () { gagal('Gambar tidak bisa dibaca.'); };
      im.onload = function () {
        var k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
        var w = Math.round(im.naturalWidth * k), h = Math.round(im.naturalHeight * k);
        var cv = document.createElement('canvas'), g = cv.getContext('2d');
        cv.width = w; cv.height = h; g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(im, 0, 0, w, h);
        ok({ img: cv.toDataURL('image/jpeg', 0.88), w: w, h: h });
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  window.Cert = { conf: conf, ok: imgOk, html: html, fit: fit, apply: apply, png: png, prep: prep };
  window.addEventListener('resize', function () { fit(document.body); });
})();