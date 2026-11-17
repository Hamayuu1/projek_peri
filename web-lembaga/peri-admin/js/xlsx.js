/* Penulis berkas Excel (.xlsx) sederhana, tanpa pustaka luar.
   Dipakai untuk ekspor data Pendaftar dan Umpan balik (Buku tamu).

   Isi sel selalu ditulis sebagai TEKS, jadi isian seperti "=1+1" tidak pernah dibaca
   Excel sebagai rumus. Berkas .xlsx adalah arsip ZIP; di sini dibuat tanpa kompresi.

   Pemakaian:
     unduhXlsx("data-pendaftar-peri.xlsx", "Pendaftar", ["Nama", "Email"], [["Ani", "a@x.id"]]);
*/
(function () {
  "use strict";

  var enc = new TextEncoder();

  // ---- CRC-32 (dibutuhkan format ZIP)
  var TABEL = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(data) {
    var c = 0xffffffff;
    for (var i = 0; i < data.length; i++) c = TABEL[(c ^ data[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  // ---- ZIP tanpa kompresi (metode "store")
  function buatZip(berkas) {
    var bagian = [];
    var pusat = [];
    var posisi = 0;
    var d = new Date();
    var waktu = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var tanggal = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();

    berkas.forEach(function (b) {
      var nama = enc.encode(b.nama);
      var isi = enc.encode(b.isi);
      var crc = crc32(isi);

      var lokal = new DataView(new ArrayBuffer(30));
      lokal.setUint32(0, 0x04034b50, true);
      lokal.setUint16(4, 20, true);
      lokal.setUint16(6, 0x0800, true); // nama berkas UTF-8
      lokal.setUint16(8, 0, true); // tanpa kompresi
      lokal.setUint16(10, waktu, true);
      lokal.setUint16(12, tanggal, true);
      lokal.setUint32(14, crc, true);
      lokal.setUint32(18, isi.length, true);
      lokal.setUint32(22, isi.length, true);
      lokal.setUint16(26, nama.length, true);
      lokal.setUint16(28, 0, true);
      bagian.push(new Uint8Array(lokal.buffer), nama, isi);

      var p = new DataView(new ArrayBuffer(46));
      p.setUint32(0, 0x02014b50, true);
      p.setUint16(4, 20, true);
      p.setUint16(6, 20, true);
      p.setUint16(8, 0x0800, true);
      p.setUint16(10, 0, true);
      p.setUint16(12, waktu, true);
      p.setUint16(14, tanggal, true);
      p.setUint32(16, crc, true);
      p.setUint32(20, isi.length, true);
      p.setUint32(24, isi.length, true);
      p.setUint16(28, nama.length, true);
      p.setUint32(42, posisi, true);
      pusat.push(new Uint8Array(p.buffer), nama);

      posisi += 30 + nama.length + isi.length;
    });

    var ukuranPusat = pusat.reduce(function (n, x) {
      return n + x.length;
    }, 0);
    var akhir = new DataView(new ArrayBuffer(22));
    akhir.setUint32(0, 0x06054b50, true);
    akhir.setUint16(8, berkas.length, true);
    akhir.setUint16(10, berkas.length, true);
    akhir.setUint32(12, ukuranPusat, true);
    akhir.setUint32(16, posisi, true);

    return new Blob(bagian.concat(pusat, [new Uint8Array(akhir.buffer)]), {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  // ---- XML
  function xml(teks) {
    return String(teks)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "") // karakter terlarang di XML
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function namaKolom(i) {
    var s = "";
    for (i += 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
    return s;
  }

  function sel(kolom, baris, nilai, gaya) {
    var teks = String(nilai == null ? "" : nilai).slice(0, 32000); // batas Excel 32.767 karakter
    return (
      '<c r="' + namaKolom(kolom) + baris + '" t="inlineStr"' + (gaya ? ' s="' + gaya + '"' : "") +
      '><is><t xml:space="preserve">' + xml(teks) + "</t></is></c>"
    );
  }

  function lembarKerja(header, baris) {
    // Lebar kolom mengikuti isi terpanjang (dibatasi 8-60 karakter).
    var lebar = header.map(function (h, i) {
      var maks = String(h).length;
      baris.forEach(function (r) {
        maks = Math.max(maks, String(r[i] == null ? "" : r[i]).split("\n")[0].length);
      });
      return Math.min(60, Math.max(8, maks + 2));
    });
    var kolom = lebar
      .map(function (w, i) {
        return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>';
      })
      .join("");
    var data = [header].concat(baris);
    var rows = data
      .map(function (r, i) {
        var gaya = i === 0 ? 1 : 2;
        return '<row r="' + (i + 1) + '">' + r.map(function (v, j) { return sel(j, i + 1, v, gaya); }).join("") + "</row>";
      })
      .join("");
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      "<cols>" + kolom + "</cols><sheetData>" + rows + "</sheetData></worksheet>"
    );
  }

  var STYLES =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF9D1E4A"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="3">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  function namaSheetAman(nama) {
    return String(nama).replace(/[\\\/?*\[\]:]/g, " ").slice(0, 31) || "Data";
  }

  /** Buat dan unduh berkas .xlsx berisi satu lembar kerja. */
  window.unduhXlsx = function (namaBerkas, namaSheet, header, baris) {
    var blob = buatZip([
      {
        nama: "[Content_Types].xml",
        isi:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
          "</Types>",
      },
      {
        nama: "_rels/.rels",
        isi:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          "</Relationships>",
      },
      {
        nama: "xl/workbook.xml",
        isi:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          '<sheets><sheet name="' + xml(namaSheetAman(namaSheet)) + '" sheetId="1" r:id="rId1"/></sheets></workbook>',
      },
      {
        nama: "xl/_rels/workbook.xml.rels",
        isi:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
          '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
          "</Relationships>",
      },
      { nama: "xl/styles.xml", isi: STYLES },
      { nama: "xl/worksheets/sheet1.xml", isi: lembarKerja(header, baris) },
    ]);
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = namaBerkas;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
})();