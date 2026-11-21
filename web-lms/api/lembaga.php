<?php
// Penghubung LMS ke web lembaga: login lewat server Flask lembaga dan membaca pendaftaran dari database peri.
// Pengaturan di bawah memakai bawaan Laragon. Ubah kalau Flask atau database lembaga berbeda.
$LEMBAGA = [
    'flask' => 'http://127.0.0.1:5001',
    'db'    => 'peri',
];

// Memanggil Flask (POST JSON). Hasil: [kode_http, data] atau null kalau Flask tidak bisa dijangkau.
function panggilFlask($path, $body) {
    global $LEMBAGA;
    $ctx = stream_context_create(['http' => [
        'method' => 'POST', 'header' => "Content-Type: application/json\r\n",
        'content' => json_encode($body), 'timeout' => 8, 'ignore_errors' => true,
    ]]);
    $res = @file_get_contents($LEMBAGA['flask'] . $path, false, $ctx);
    if ($res === false) return null;
    $kode = 0;
    if (isset($http_response_header[0]) && preg_match('#\s(\d{3})\s#', $http_response_header[0], $m)) $kode = (int) $m[1];
    return [$kode, json_decode($res, true)];
}

// Mencari akun LMS untuk pengguna lembaga; dibuat kalau belum ada. Mengembalikan id akun LMS atau null.
function pastikanPengguna($pdo, $periId, $email) {
    $email = strtolower(trim((string) $email));
    $st = $pdo->prepare("SELECT id FROM users WHERE peri_user_id = ?");
    $st->execute([$periId]);
    $r = $st->fetch();
    if ($r) return (int) $r['id'];
    $st = $pdo->prepare("SELECT id FROM users WHERE LOWER(email) = ? AND role = 'peserta' AND peri_user_id IS NULL");
    $st->execute([$email]);
    $r = $st->fetch();
    if ($r) {
        $pdo->prepare("UPDATE users SET peri_user_id = ? WHERE id = ?")->execute([$periId, $r['id']]);
        return (int) $r['id'];
    }
    try {
        $pdo->prepare("INSERT INTO users (email, peri_user_id, role) VALUES (?, ?, 'peserta')")->execute([$email, $periId]);
        return (int) $pdo->lastInsertId();
    } catch (Exception $e) { return null; }
}

// Peta nama program lembaga (huruf kecil) => id kelas LMS.
function petaProgram($pdo) {
    $peta = [];
    foreach ($pdo->query("SELECT id, nama_lembaga FROM lms_program WHERE nama_lembaga IS NOT NULL") as $r)
        $peta[mb_strtolower(trim($r['nama_lembaga']))] = $r['id'];
    return $peta;
}

// Menyamakan keanggotaan kelas satu pengguna dengan pendaftarannya di lembaga.
// Aturan: pendaftaran berstatus diterima => masuk kelas (satu kelas saja, yang paling awal terdaftar);
// konfirmasi dibatalkan => akses dinonaktifkan; status selesai tidak diubah.
// Mengembalikan daftar pendaftaran pengguna itu: [['prog' => id kelas atau null, 'program' => nama, 'status' => baru|diterima], ...]
function sinkronKelas($pdo, $uid, $periId, $peta) {
    global $LEMBAGA;
    $st = $pdo->prepare("SELECT program, status, nama FROM `{$LEMBAGA['db']}`.pendaftaran_program WHERE user_id = ? ORDER BY id");
    $st->execute([$periId]);
    $baris = $st->fetchAll();
    $daftar = []; $diterima = [];
    foreach ($baris as $b) {
        $pg = $peta[mb_strtolower(trim($b['program']))] ?? null;
        $daftar[] = ['prog' => $pg, 'program' => $b['program'], 'status' => $b['status']];
        if ($b['status'] === 'diterima' && $pg !== null && !in_array($pg, $diterima, true)) $diterima[] = $pg;
    }

    // Nama di sertifikat diambil dari nama saat mendaftar di lembaga (kalau profil belum ada).
    if ($baris) {
        $c = $pdo->prepare("SELECT 1 FROM lms_profil WHERE user_id = ?"); $c->execute([$uid]);
        if (!$c->fetch()) $pdo->prepare("INSERT INTO lms_profil (user_id, nama_lengkap) VALUES (?, ?)")->execute([$uid, mb_substr((string) $baris[0]['nama'], 0, 100)]);
    }

    $m = $pdo->prepare("SELECT program_id, status FROM lms_peserta_program WHERE user_id = ?");
    $m->execute([$uid]);
    $ada = $m->fetch();
    $masuk = function ($pg) use ($pdo, $uid) {
        $pdo->prepare("INSERT INTO lms_peserta_program (program_id, user_id, status, bergabung_pada) VALUES (?, ?, 'aktif', ?)")->execute([$pg, $uid, date('Y-m-d H:i:s')]);
    };
    if (!$ada) {
        if ($diterima) $masuk($diterima[0]);
    } elseif ($ada['status'] !== 'selesai') {
        if (in_array($ada['program_id'], $diterima, true)) {
            if ($ada['status'] === 'nonaktif') $pdo->prepare("UPDATE lms_peserta_program SET status = 'aktif' WHERE user_id = ?")->execute([$uid]);
        } elseif ($diterima) {
            $pdo->prepare("DELETE FROM lms_peserta_program WHERE user_id = ?")->execute([$uid]);
            $masuk($diterima[0]);
        } elseif ($ada['status'] === 'aktif') {
            $pdo->prepare("UPDATE lms_peserta_program SET status = 'nonaktif' WHERE user_id = ?")->execute([$uid]);
        }
    }
    return $daftar;
}

// Dipanggil setiap data dimuat: akun peserta yang sudah diterima dibuatkan otomatis, lalu kelas disamakan.
// Kalau database lembaga belum ada atau Flask belum pernah dijalankan, bagian ini dilewati tanpa mengganggu aplikasi.
// Hasil: daftar pendaftaran untuk ditampilkan: [['pid' => ..., 'prog' => ..., 'program' => ..., 'status' => ...], ...]
function sinkronSemua($pdo) {
    global $LEMBAGA;
    $hasil = [];
    try {
        foreach ($pdo->query("SELECT DISTINCT pp.user_id, u.email FROM `{$LEMBAGA['db']}`.pendaftaran_program pp JOIN `{$LEMBAGA['db']}`.users u ON u.id = pp.user_id WHERE pp.status = 'diterima' AND u.role = 'pendaftar'")->fetchAll() as $r)
            pastikanPengguna($pdo, (int) $r['user_id'], $r['email']);
        $peta = petaProgram($pdo);
        foreach ($pdo->query("SELECT id, peri_user_id FROM users WHERE peri_user_id IS NOT NULL AND role = 'peserta'")->fetchAll() as $u) {
            foreach (sinkronKelas($pdo, (int) $u['id'], (int) $u['peri_user_id'], $peta) as $d)
                $hasil[] = ['pid' => pidDari($u['id']), 'prog' => $d['prog'], 'program' => $d['program'], 'status' => $d['status']];
        }
    } catch (Exception $e) { return []; }
    return $hasil;
}