<?php
// Pengumpulan tugas oleh peserta: banyak isian (berkas, foto, link) sekaligus. Hanya POST (multipart).
// Kolom: prog, id (tugas), pid, catatan, keep (JSON daftar ref isian lama yang dipertahankan), link[] (alamat), berkas[] (berkas).
// Setiap pengiriman menggantikan seluruh isian lama: yang tidak ada di keep akan dihapus.
require __DIR__ . '/db.php';
require __DIR__ . '/berkas.php';
require __DIR__ . '/guard.php';
$sesi = wajibPeran('peserta');
wajibCsrfHeader();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') keluar(['ok' => false, 'pesan' => 'Hanya POST'], 405);
if (empty($_POST) && empty($_FILES)) keluar(['ok' => false, 'pesan' => 'Permintaan terlalu besar atau kosong. Periksa batas post_max_size di php.ini.'], 400);

$pdo = koneksi();
$prog = (string) ($_POST['prog'] ?? '');
$tid = $prog . '-' . (string) ($_POST['id'] ?? '');
$uid = idDari($sesi['uid']);

$st = $pdo->prepare("SELECT 1 FROM lms_tugas WHERE id = ? AND program_id = ?");
$st->execute([$tid, $prog]);
if (!$st->fetch()) keluar(['ok' => false, 'pesan' => 'Tugas tidak ditemukan.'], 404);
$st = $pdo->prepare("SELECT 1 FROM lms_peserta_program WHERE program_id = ? AND user_id = ? AND status IN ('aktif','selesai')");
$st->execute([$prog, $uid]);
if (!$st->fetch()) keluar(['ok' => false, 'pesan' => 'Anda tidak terdaftar di kelas ini.'], 403);

$st = $pdo->prepare("SELECT tipe, nama, path, url, kb FROM lms_pengumpulan_item WHERE tugas_id = ? AND user_id = ? ORDER BY urutan");
$st->execute([$tid, $uid]);
$lama = $st->fetchAll();

// Isian lama yang dipertahankan (dicocokkan lewat ref dengan data di database, bukan dari kiriman browser).
$keep = json_decode((string) ($_POST['keep'] ?? '[]'), true);
if (!is_array($keep)) $keep = [];
$isi = []; $tetap = [];
foreach ($keep as $ref) {
    foreach ($lama as $i => $o) {
        if (isset($tetap[$i]) || (string) $ref !== refDari($o['tipe'], $o['path'], $o['url'])) continue;
        $tetap[$i] = true; $isi[] = $o; break;
    }
}

$links = $_POST['link'] ?? [];
if (!is_array($links)) $links = [$links];
$links = array_values(array_filter(array_map(function ($x) { return trim((string) $x); }, $links), 'strlen'));
$files = daftarBerkas($_FILES['berkas'] ?? null);

$jumlah = count($isi) + count($files) + count($links);
if ($jumlah < 1) keluar(['ok' => false, 'pesan' => 'Tambahkan minimal satu berkas atau link.'], 400);
if ($jumlah > MAKS_ISIAN) keluar(['ok' => false, 'pesan' => 'Maksimal ' . MAKS_ISIAN . ' isian per tugas.'], 400);
$kb = 0;
foreach ($isi as $o) $kb += (int) $o['kb'];
foreach ($files as $f) $kb += (int) ceil(((int) $f['size']) / 1024);
if ($kb > BATAS_TOTAL_KB) keluar(['ok' => false, 'pesan' => 'Total ukuran melebihi 100 MB.'], 400);

foreach ($links as $l) if (validasiLink($l) === null) keluar(['ok' => false, 'pesan' => 'Alamat link tidak valid: ' . mb_substr($l, 0, 60) . '. Harus diawali http:// atau https://.'], 400);

$tersimpan = [];
foreach ($files as $f) {
    $r = terimaBerkas($f, 'tugas', false);
    if (!$r['ok']) { foreach ($tersimpan as $p) hapusBerkas('tugas', $p); keluar(['ok' => false, 'pesan' => $r['pesan']], 400); }
    $tersimpan[] = $r['path'];
    $isi[] = ['tipe' => 'berkas', 'nama' => $r['nama'], 'path' => $r['path'], 'url' => null, 'kb' => $r['kb']];
}
foreach ($links as $l) $isi[] = ['tipe' => 'link', 'nama' => namaLink($l), 'path' => null, 'url' => $l, 'kb' => null];

$cat = mb_substr(trim((string) ($_POST['catatan'] ?? '')), 0, 255);
$kini = date('Y-m-d H:i:s');
try {
    $pdo->beginTransaction();
    $st = $pdo->prepare("SELECT 1 FROM lms_pengumpulan WHERE tugas_id = ? AND user_id = ?");
    $st->execute([$tid, $uid]);
    if ($st->fetch()) $pdo->prepare("UPDATE lms_pengumpulan SET nama_berkas = ?, catatan = ?, dikumpul_pada = ? WHERE tugas_id = ? AND user_id = ?")->execute([$isi[0]['nama'], $cat, $kini, $tid, $uid]);
    else $pdo->prepare("INSERT INTO lms_pengumpulan (tugas_id, user_id, nama_berkas, catatan, dikumpul_pada) VALUES (?,?,?,?,?)")->execute([$tid, $uid, $isi[0]['nama'], $cat, $kini]);
    $pdo->prepare("DELETE FROM lms_pengumpulan_item WHERE tugas_id = ? AND user_id = ?")->execute([$tid, $uid]);
    $in = $pdo->prepare("INSERT INTO lms_pengumpulan_item (tugas_id, user_id, urutan, tipe, nama, path, url, kb) VALUES (?,?,?,?,?,?,?,?)");
    foreach ($isi as $n => $o) $in->execute([$tid, $uid, $n + 1, $o['tipe'], $o['nama'], $o['path'], $o['url'], $o['kb']]);
    $pdo->commit();
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    foreach ($tersimpan as $p) hapusBerkas('tugas', $p);
    keluar(['ok' => false, 'pesan' => 'Gagal menyimpan pengumpulan.'], 500);
}
foreach ($lama as $i => $o) if (empty($tetap[$i]) && $o['path']) hapusBerkas('tugas', $o['path']);

$items = [];
foreach ($isi as $o) $items[] = ['nama' => $o['nama'], 'tipe' => $o['tipe'], 'url' => $o['url'], 'ref' => refDari($o['tipe'], $o['path'], $o['url']), 'kb' => (int) $o['kb']];
keluar(['ok' => true, 'data' => ['file' => $isi[0]['nama'] . (count($isi) > 1 ? ' (+' . (count($isi) - 1) . ')' : ''), 'at' => substr($kini, 0, 16), 'catatan' => $cat, 'items' => $items]]);