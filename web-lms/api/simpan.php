<?php
// Menerima seluruh data aplikasi (JSON) dan menuliskannya ke tabel lms_*. Hanya POST.
require __DIR__ . '/db.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') keluar(['ok' => false, 'pesan' => 'Hanya POST'], 405);

$d = json_decode(file_get_contents('php://input'), true);
if (!is_array($d) || !isset($d['programs']) || !is_array($d['programs']) || !isset($d['pendaftaran']) || !isset($d['undangan']))
    keluar(['ok' => false, 'pesan' => 'Data tidak lengkap, penyimpanan dibatalkan.'], 400);

$pdo = koneksi();
$ada = [];
foreach ($pdo->query("SELECT id FROM users") as $r) $ada[(int) $r['id']] = true;
$uid = function ($pid) use ($ada) { $i = idDari($pid); return isset($ada[$i]) ? $i : null; };
$wkt = function ($s) { $s = trim((string) $s); return preg_match('/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?/', $s) ? (strlen($s) <= 10 ? $s . ' 00:00:00' : substr($s, 0, 16) . ':00') : date('Y-m-d H:i:s'); };
$tgl = function ($s) { return preg_match('/^\d{4}-\d{2}-\d{2}/', (string) $s) ? substr($s, 0, 10) : date('Y-m-d'); };
$jam = function ($j) {
    $p = explode('-', (string) $j);
    $f = function ($x) { $x = str_replace('.', ':', trim($x)); return preg_match('/^\d{1,2}:\d{2}/', $x) ? substr(str_pad($x, 5, '0', STR_PAD_LEFT), 0, 5) . ':00' : '00:00:00'; };
    return [$f($p[0] ?? ''), $f($p[1] ?? $p[0] ?? '')];
};

try {
    $nl = $pdo->query("SELECT id, nama_lembaga FROM lms_program")->fetchAll(PDO::FETCH_KEY_PAIR);
    $pdo->beginTransaction();
    foreach (['lms_pendaftaran', 'lms_undangan', 'lms_program'] as $t) $pdo->exec("DELETE FROM $t"); // anak-anaknya ikut terhapus (CASCADE)

    $inP = $pdo->prepare("INSERT INTO lms_program (id,nama,kategori,tujuan,deskripsi,periode,angkatan,kuota,status,kode_kelas,fasilitator,pengumuman,urutan,nama_lembaga) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
    $inPP = $pdo->prepare("INSERT INTO lms_peserta_program (program_id,user_id,status,bergabung_pada,selesai_pada) VALUES (?,?,?,?,?)");
    $inS = $pdo->prepare("INSERT INTO lms_sesi (id,program_id,no,judul,tanggal,jam_mulai,jam_selesai,mode,tempat,materi_nama,materi_kb) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
    $inH = $pdo->prepare("INSERT INTO lms_kehadiran (sesi_id,user_id,dicatat_pada) VALUES (?,?,?)");
    $inT = $pdo->prepare("INSERT INTO lms_tugas (id,program_id,sesi_no,judul,tenggat,deskripsi) VALUES (?,?,?,?,?,?)");
    $inK = $pdo->prepare("INSERT INTO lms_pengumpulan (tugas_id,user_id,nama_berkas,catatan,dikumpul_pada) VALUES (?,?,?,?,?)");
    $inC = $pdo->prepare("INSERT INTO lms_sertifikat_template (program_id,gambar,lebar,tinggi,pos_x,pos_y,ukuran,warna,ketebalan,kapital) VALUES (?,?,?,?,?,?,?,?,?,?)");
    $sekarang = date('Y-m-d H:i:s');
    $kodeProg = [];

    foreach (array_values($d['programs']) as $no => $p) {
        $id = (string) $p['id'];
        $kode = (string) ($p['kode'] ?? strtoupper($id));
        $kodeProg[$kode] = $id;
        $st = in_array($p['status'] ?? '', ['segera', 'buka', 'tutup'], true) ? $p['status'] : 'buka';
        $inP->execute([$id, $p['nama'] ?? '', $p['kategori'] ?? '', $p['tujuan'] ?? '', $p['desc'] ?? '', $p['periode'] ?? '', $p['angkatan'] ?? '', (int) ($p['kuota'] ?? 30), $st, $kode, $p['fas'] ?? '', $p['ann'] ?? '', $no + 1, $nl[$id] ?? null]);

        $selesai = array_flip($p['selesai'] ?? []);
        foreach (array_unique($p['peserta'] ?? []) as $pid) {
            $u = $uid($pid); if ($u === null) continue;
            $fin = isset($selesai[$pid]);
            $inPP->execute([$id, $u, $fin ? 'selesai' : 'aktif', $sekarang, $fin ? $sekarang : null]);
        }
        foreach ($p['sesi'] ?? [] as $s) {
            [$a, $b] = $jam($s['jam'] ?? '');
            $m = $s['mode'] ?? 'Luring'; if (!in_array($m, ['Luring', 'Daring'], true)) $m = 'Luring';
            $mat = $s['materi'] ?? null;
            $inS->execute([$s['id'], $id, (int) $s['no'], $s['judul'] ?? '', $tgl($s['tanggal'] ?? ''), $a, $b, $m, $s['tempat'] ?? '', $mat['nama'] ?? null, isset($mat['kb']) ? (int) $mat['kb'] : null]);
            foreach (array_unique($s['hadir'] ?? []) as $pid) { $u = $uid($pid); if ($u !== null) $inH->execute([$s['id'], $u, $sekarang]); }
        }
        foreach ($p['tugas'] ?? [] as $t)
            $inT->execute([$id . '-' . $t['id'], $id, (int) ($t['sesi'] ?? 1), $t['judul'] ?? '', $tgl($t['due'] ?? ''), $t['desc'] ?? '']);
        foreach ($p['kumpul'] ?? [] as $tid => $arr) {
            if (!is_array($arr)) continue;
            foreach ($arr as $pid => $k) {
                $u = $uid($pid); if ($u === null) continue;
                $inK->execute([$id . '-' . $tid, $u, $k['file'] ?? '', $k['catatan'] ?? '', $wkt($k['at'] ?? '')]);
            }
        }
        $c = $p['sertif'] ?? null;
        if (is_array($c) && !empty($c['img']))
            $inC->execute([$id, $c['img'], (int) ($c['w'] ?? 0), (int) ($c['h'] ?? 0), (float) ($c['x'] ?? 50), (float) ($c['y'] ?? 56), (float) ($c['size'] ?? 5), $c['color'] ?? '#2B1C1A', (int) ($c['weight'] ?? 600), !empty($c['caps']) ? 1 : 0]);
    }

    $inD = $pdo->prepare("INSERT INTO lms_pendaftaran (user_id,program_id,status,alasan,created_at) VALUES (?,?,?,?,?)");
    foreach ($d['pendaftaran'] as $r) {
        $u = $uid($r['pid'] ?? ''); if ($u === null) continue;
        $stt = in_array($r['status'] ?? '', ['menunggu', 'diterima', 'ditolak'], true) ? $r['status'] : 'menunggu';
        if (($r['status'] ?? '') === 'disetujui') $stt = 'diterima';
        $inD->execute([$u, $r['prog'], $stt, $r['alasan'] ?? '', $wkt($r['tgl'] ?? '')]);
    }
    $inU = $pdo->prepare("INSERT INTO lms_undangan (user_id,program_id,dari,status) VALUES (?,?,?,?)");
    foreach ($d['undangan'] as $r) {
        $u = $uid($r['pid'] ?? ''); $pg = $kodeProg[$r['kode'] ?? ''] ?? null; if ($u === null || $pg === null) continue;
        $stt = in_array($r['status'] ?? '', ['menunggu', 'diterima', 'ditolak'], true) ? $r['status'] : 'menunggu';
        $inU->execute([$u, $pg, $r['dari'] ?? '', $stt]);
    }
    $pdo->commit();
    keluar(['ok' => true]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    keluar(['ok' => false, 'pesan' => 'Gagal menyimpan: ' . $e->getMessage()], 500);
}