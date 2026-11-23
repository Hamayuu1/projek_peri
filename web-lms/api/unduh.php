<?php
// Mengirim berkas materi atau pengumpulan tugas. Berkas tidak bisa dibuka langsung dari folder uploads.
// GET: jenis=materi&id=SESI  atau  jenis=tugas&prog=PROGRAM&id=TUGAS&pid=PESERTA ; tambahkan inline=1 untuk membuka di browser (PDF, gambar, MP4).
require __DIR__ . '/db.php';
require __DIR__ . '/berkas.php';
require __DIR__ . '/guard.php';
$sesi = wajibLogin();
$pdo = koneksi();
$jenis = (string) ($_GET['jenis'] ?? '');
if ($jenis === 'materi') {
    $sql = "SELECT s.materi_nama AS nama, s.materi_tipe AS tipe, s.materi_path AS path FROM lms_sesi s WHERE s.id = ?";
    $par = [(string) ($_GET['id'] ?? '')];
    if ($sesi['peran'] !== 'admin') { // peserta hanya boleh mengunduh materi kelas yang aktif diikutinya
        $sql .= " AND EXISTS (SELECT 1 FROM lms_peserta_program pp WHERE pp.program_id = s.program_id AND pp.user_id = ? AND pp.status IN ('aktif','selesai'))";
        $par[] = idDari($sesi['uid']);
    }
    $st = $pdo->prepare($sql);
    $st->execute($par);
} elseif ($jenis === 'tugas') {
    $st = $pdo->prepare("SELECT nama, tipe, path FROM lms_pengumpulan_item WHERE tugas_id = ? AND user_id = ? AND urutan = ?");
    $pemilik = $sesi['peran'] === 'admin' ? idDari($_GET['pid'] ?? '') : idDari($sesi['uid']);
    $st->execute([(string) ($_GET['prog'] ?? '') . '-' . (string) ($_GET['id'] ?? ''), $pemilik, max(1, (int) ($_GET['n'] ?? 1))]);
} else keluar(['ok' => false, 'pesan' => 'Permintaan tidak valid.'], 400);

$r = $st->fetch();
if (!$r || $r['tipe'] !== 'berkas' || !$r['path'] || !preg_match('/^[a-f0-9]{32}\.[a-z0-9]{2,5}$/', $r['path'])) keluar(['ok' => false, 'pesan' => 'Berkas tidak ditemukan.'], 404);
$file = UPLOAD_DIR . '/' . $jenis . '/' . $r['path'];
if (!is_file($file)) keluar(['ok' => false, 'pesan' => 'Berkas tidak ditemukan di server.'], 404);

$ext = strtolower(pathinfo($r['path'], PATHINFO_EXTENSION));
$tipeMime = ['pdf' => 'application/pdf', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'mp4' => 'video/mp4'];
$boleh = isset($tipeMime[$ext]) && !empty($_GET['inline']);
$asci = preg_replace('/[^A-Za-z0-9._-]+/', '_', $r['nama']) ?: 'berkas';
while (ob_get_level()) ob_end_clean();
header('Content-Type: ' . ($tipeMime[$ext] ?? 'application/octet-stream'));
header('X-Content-Type-Options: nosniff');
header('Content-Length: ' . filesize($file));
header('Content-Disposition: ' . ($boleh ? 'inline' : 'attachment') . "; filename=\"$asci\"; filename*=UTF-8''" . rawurlencode($r['nama']));
header('Cache-Control: private, no-store');
readfile($file);
exit;