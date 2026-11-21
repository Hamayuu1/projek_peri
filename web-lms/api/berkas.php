<?php
// Pembantu unggah berkas dan link untuk materi dan pengumpulan tugas.
define('UPLOAD_DIR', dirname(__DIR__) . '/uploads');
define('BATAS_BYTE', 50 * 1024 * 1024);

// Jenis berkas yang diizinkan: ekstensi => [daftar mime yang diterima, boleh dibuka langsung di browser].
function jenisBerkas($untukMateri) {
    $zip = ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'];
    $ole = ['application/msword', 'application/vnd.ms-powerpoint', 'application/vnd.ms-excel', 'application/CDFV2', 'application/x-ole-storage', 'application/octet-stream'];
    $ox = array_merge(['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], $zip);
    $j = [
        'pdf' => [['application/pdf'], true], 'jpg' => [['image/jpeg'], true], 'jpeg' => [['image/jpeg'], true], 'png' => [['image/png'], true],
        'doc' => [$ole, false], 'ppt' => [$ole, false], 'xls' => [$ole, false],
        'docx' => [$ox, false], 'pptx' => [$ox, false], 'xlsx' => [$ox, false], 'zip' => [$zip, false],
    ];
    if ($untukMateri) $j['mp4'] = [['video/mp4', 'video/x-m4v'], true];
    return $j;
}

// Alamat link: hanya http atau https.
function validasiLink($u) {
    $u = trim((string) $u);
    if ($u === '' || strlen($u) > 500 || preg_match('/[\s\x00-\x1f]/', $u)) return null;
    if (!preg_match('#^https?://#i', $u) || !filter_var($u, FILTER_VALIDATE_URL)) return null;
    return parse_url($u, PHP_URL_HOST) ? $u : null;
}

function namaLink($u) { $h = parse_url($u, PHP_URL_HOST); return mb_substr('Link: ' . ($h ?: $u), 0, 190); }

// Memeriksa dan menyimpan satu berkas unggahan. Hasil: ['ok' => true, 'nama', 'kb', 'path'] atau ['ok' => false, 'pesan'].
function terimaBerkas($f, $sub, $untukMateri) {
    $gagal = function ($p) { return ['ok' => false, 'pesan' => $p]; };
    if (!is_array($f) || !isset($f['error'])) return $gagal('Berkas belum dipilih.');
    if ($f['error'] === UPLOAD_ERR_INI_SIZE || $f['error'] === UPLOAD_ERR_FORM_SIZE) return $gagal('Berkas melebihi batas ukuran server. Naikkan upload_max_filesize dan post_max_size di php.ini.');
    if ($f['error'] === UPLOAD_ERR_NO_FILE) return $gagal('Berkas belum dipilih.');
    if ($f['error'] !== UPLOAD_ERR_OK) return $gagal('Berkas gagal diunggah (kode ' . $f['error'] . ').');
    if ($f['size'] > BATAS_BYTE) return $gagal('Ukuran berkas melebihi 50 MB.');
    if ($f['size'] <= 0) return $gagal('Berkas kosong.');
    $asli = preg_replace('/[\x00-\x1f\/\\\\]/', '', basename((string) $f['name']));
    if (!mb_check_encoding($asli, 'UTF-8')) $asli = 'berkas';
    $asli = mb_substr($asli, 0, 150);
    $ext = strtolower(pathinfo($asli, PATHINFO_EXTENSION));
    $izin = jenisBerkas($untukMateri);
    if (!isset($izin[$ext])) return $gagal('Jenis berkas tidak diizinkan. Yang boleh: ' . implode(', ', array_keys($izin)) . ', atau gunakan link.');
    if (function_exists('finfo_open')) {
        $fi = finfo_open(FILEINFO_MIME_TYPE); $mime = finfo_file($fi, $f['tmp_name']); finfo_close($fi);
        if (!in_array($mime, $izin[$ext][0], true)) return $gagal('Isi berkas tidak sesuai dengan jenisnya (.' . $ext . ').');
    }
    $dir = UPLOAD_DIR . '/' . $sub;
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) return $gagal('Folder uploads tidak bisa dibuat.');
    $path = bin2hex(random_bytes(16)) . '.' . $ext;
    if (!@move_uploaded_file($f['tmp_name'], $dir . '/' . $path)) return $gagal('Berkas gagal disimpan di server.');
    return ['ok' => true, 'nama' => $asli, 'kb' => (int) ceil($f['size'] / 1024), 'path' => $path];
}

function hapusBerkas($sub, $path) {
    if (!$path || !preg_match('/^[a-f0-9]{32}\.[a-z0-9]{2,5}$/', (string) $path)) return;
    $p = UPLOAD_DIR . '/' . $sub . '/' . $path;
    if (is_file($p)) @unlink($p);
}

// Penanda yang dikirim ke aplikasi supaya simpan.php bisa memastikan berkas atau link memang berasal dari unggah.php.
function refDari($tipe, $path, $url) {
    if ($tipe === 'berkas') return (string) $path;
    if ($tipe === 'link') return substr(sha1((string) $url), 0, 20);
    return '';
}

// Batas pengumpulan tugas: banyak isian per tugas.
define('MAKS_ISIAN', 10);
define('BATAS_TOTAL_KB', 100 * 1024);

// Mengubah $_FILES['berkas'] (satu atau banyak berkas) menjadi daftar berkas, tanpa kolom yang kosong.
function daftarBerkas($f) {
    if (!is_array($f) || !isset($f['name'])) return [];
    $d = [];
    if (!is_array($f['name'])) $d[] = $f;
    else foreach ($f['name'] as $i => $n) $d[] = ['name' => $n, 'type' => $f['type'][$i] ?? '', 'tmp_name' => $f['tmp_name'][$i] ?? '', 'error' => $f['error'][$i] ?? UPLOAD_ERR_NO_FILE, 'size' => $f['size'][$i] ?? 0];
    return array_values(array_filter($d, function ($x) { return ($x['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE; }));
}

// Menghapus berkas yang tidak dipakai lagi setelah penyimpanan berhasil.
function hapusYatim($mOld, $kOld, $dipakai) {
    foreach ($mOld as $o) if (!empty($o['materi_path']) && empty($dipakai['materi/' . $o['materi_path']])) hapusBerkas('materi', $o['materi_path']);
    foreach ($kOld as $o) if (!empty($o['path']) && empty($dipakai['tugas/' . $o['path']])) hapusBerkas('tugas', $o['path']);
}