<?php
// Menerima berkas atau link untuk materi (admin) dan pengumpulan tugas (peserta). Hanya POST (multipart).
require __DIR__ . '/db.php';
require __DIR__ . '/berkas.php';
require __DIR__ . '/guard.php';
$sesi = wajibLogin();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') keluar(['ok' => false, 'pesan' => 'Hanya POST'], 405);

$jenis = (string) ($_POST['jenis'] ?? '');
$tipe = (string) ($_POST['tipe'] ?? 'berkas');
if (!in_array($jenis, ['materi', 'tugas'], true) || !in_array($tipe, ['berkas', 'link'], true))
    keluar(['ok' => false, 'pesan' => 'Permintaan tidak valid. Jika berkas besar, periksa batas post_max_size di php.ini.'], 400);

if ($jenis === 'materi' && $sesi['peran'] !== 'admin') keluar(['ok' => false, 'pesan' => 'Anda tidak memiliki akses.'], 403);
if ($jenis === 'tugas' && $sesi['peran'] !== 'peserta') keluar(['ok' => false, 'pesan' => 'Anda tidak memiliki akses.'], 403);
$pdo = koneksi();
$sub = $jenis;

if ($jenis === 'materi') {
    $sid = (string) ($_POST['id'] ?? '');
    $st = $pdo->prepare("SELECT materi_path FROM lms_sesi WHERE id = ?");
    $st->execute([$sid]);
    $lama = $st->fetch();
    if (!$lama) keluar(['ok' => false, 'pesan' => 'Sesi belum tersimpan. Coba lagi sebentar lagi.'], 404);
} else {
    $prog = (string) ($_POST['prog'] ?? '');
    $tid = $prog . '-' . (string) ($_POST['id'] ?? '');
    $uid = idDari($sesi['uid']);
    $st = $pdo->prepare("SELECT 1 FROM lms_tugas WHERE id = ? AND program_id = ?");
    $st->execute([$tid, $prog]);
    if (!$st->fetch()) keluar(['ok' => false, 'pesan' => 'Tugas tidak ditemukan.'], 404);
    $st = $pdo->prepare("SELECT 1 FROM lms_peserta_program WHERE program_id = ? AND user_id = ? AND status IN ('aktif','selesai')");
    $st->execute([$prog, $uid]);
    if (!$st->fetch()) keluar(['ok' => false, 'pesan' => 'Anda tidak terdaftar di kelas ini.'], 403);
    $st = $pdo->prepare("SELECT path_berkas FROM lms_pengumpulan WHERE tugas_id = ? AND user_id = ?");
    $st->execute([$tid, $uid]);
    $lama = $st->fetch();
}

$url = null; $path = null; $kb = null;
if ($tipe === 'link') {
    $url = validasiLink($_POST['url'] ?? '');
    if ($url === null) keluar(['ok' => false, 'pesan' => 'Alamat link tidak valid. Harus diawali http:// atau https://.'], 400);
    $nama = namaLink($url);
} else {
    $r = terimaBerkas($_FILES['berkas'] ?? null, $sub, $jenis === 'materi');
    if (!$r['ok']) keluar(['ok' => false, 'pesan' => $r['pesan']], 400);
    $nama = $r['nama']; $kb = $r['kb']; $path = $r['path'];
}

try {
    if ($jenis === 'materi') {
        $pdo->prepare("UPDATE lms_sesi SET materi_nama = ?, materi_kb = ?, materi_tipe = ?, materi_path = ?, materi_url = ? WHERE id = ?")
            ->execute([$nama, $kb, $tipe, $path, $url, $sid]);
        $data = ['nama' => $nama, 'kb' => (int) $kb, 'tipe' => $tipe, 'url' => $url, 'ref' => refDari($tipe, $path, $url)];
    } else {
        $cat = mb_substr(trim((string) ($_POST['catatan'] ?? '')), 0, 255);
        $kini = date('Y-m-d H:i:s');
        if ($lama) $pdo->prepare("UPDATE lms_pengumpulan SET nama_berkas = ?, tipe = ?, path_berkas = ?, url = ?, kb = ?, catatan = ?, dikumpul_pada = ? WHERE tugas_id = ? AND user_id = ?")
            ->execute([$nama, $tipe, $path, $url, $kb, $cat, $kini, $tid, $uid]);
        else $pdo->prepare("INSERT INTO lms_pengumpulan (tugas_id, user_id, nama_berkas, tipe, path_berkas, url, kb, catatan, dikumpul_pada) VALUES (?,?,?,?,?,?,?,?,?)")
            ->execute([$tid, $uid, $nama, $tipe, $path, $url, $kb, $cat, $kini]);
        $data = ['file' => $nama, 'at' => substr($kini, 0, 16), 'catatan' => $cat, 'tipe' => $tipe, 'url' => $url, 'ref' => refDari($tipe, $path, $url), 'kb' => (int) $kb];
    }
} catch (Exception $e) {
    hapusBerkas($sub, $path);
    keluar(['ok' => false, 'pesan' => 'Gagal menyimpan data berkas.'], 500);
}
if ($lama) hapusBerkas($sub, $jenis === 'materi' ? $lama['materi_path'] : $lama['path_berkas']);
keluar(['ok' => true, 'data' => $data]);