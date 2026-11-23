<?php
// Penghubung LMS ke web lembaga: login lewat server Flask lembaga dan membaca pendaftaran dari database peri.
// Alamat Flask diatur di .env (LMS_FLASK_URL, LMS_KUNCI); bawaannya untuk Laragon.
$LEMBAGA = ['flask' => rtrim($ENV_LMS['LMS_FLASK_URL'] ?? 'http://127.0.0.1:5001', '/')];

// Memanggil Flask (POST JSON). Hasil: [kode_http, data] atau null kalau Flask tidak bisa dijangkau.
function panggilFlask($path, $body) {
    global $LEMBAGA;
    global $ENV_LMS;
    $kunci = (string) ($ENV_LMS['LMS_KUNCI'] ?? '');
    $ctx = stream_context_create(['http' => [
        'method' => 'POST', 'header' => "Content-Type: application/json\r\n" . ($kunci !== '' ? "X-LMS-Key: $kunci\r\n" : ''),
        'content' => json_encode($body), 'timeout' => 8, 'ignore_errors' => true,
    ]]);
    $res = @file_get_contents($LEMBAGA['flask'] . $path, false, $ctx);
    if ($res === false) return null;
    $kode = 0;
    if (isset($http_response_header[0]) && preg_match('#\s(\d{3})\s#', $http_response_header[0], $m)) $kode = (int) $m[1];
    return [$kode, json_decode($res, true)];
}

// Mengambil pendaftaran program dari Flask (bukan langsung dari database lembaga). Hasil: daftar baris atau null kalau gagal.
function ambilPendaftaran($periId = null) {
    $r = panggilFlask('/api/lms/pendaftaran', $periId === null ? new stdClass() : ['user_id' => (int) $periId]);
    if ($r === null || $r[0] !== 200 || !is_array($r[1]) || !isset($r[1]['pendaftaran'])) return null;
    return $r[1]['pendaftaran'];
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

// Peta id program lembaga => id kelas LMS.
function petaProgram($pdo) {
    $peta = [];
    foreach ($pdo->query("SELECT id, id_lembaga FROM lms_program WHERE id_lembaga IS NOT NULL") as $r)
        $peta[(int) $r['id_lembaga']] = $r['id'];
    return $peta;
}

// Katalog program situs lembaga dari Flask (publik): daftar [['id' => n, 'nama' => '...'], ...] atau null kalau gagal.
function ambilProgramLembaga() {
    global $LEMBAGA;
    $ctx = stream_context_create(['http' => ['method' => 'GET', 'timeout' => 8, 'ignore_errors' => true]]);
    $res = @file_get_contents($LEMBAGA['flask'] . '/api/program', false, $ctx);
    $j = $res === false ? null : json_decode($res, true);
    if (!is_array($j) || !isset($j['program']) || !is_array($j['program'])) return null;
    $out = [];
    foreach ($j['program'] as $p) if (isset($p['id']) && !empty($p['nama'])) $out[] = ['id' => (int) $p['id'], 'nama' => (string) $p['nama']];
    return $out;
}

// Menyamakan kelas dengan katalog lembaga: kelas lama yang terhubung lewat nama diisi id-nya, dan nama kelas mengikuti nama di lembaga.
// $buat = true (hanya saat admin memuat data): program lembaga yang belum punya kelas dibuatkan kelas kosong otomatis.
// Dibatasi untuk admin supaya salinan data admin yang sedang terbuka tidak tertinggal dari server.
function sinkronProgram($pdo, $buat = false) {
    $kat = ambilProgramLembaga();
    if ($kat === null) return;
    try {
        $nama = []; $perNama = [];
        foreach ($kat as $p) { $nama[$p['id']] = $p['nama']; $perNama[mb_strtolower(trim($p['nama']))] = $p['id']; }
        $up = $pdo->prepare("UPDATE lms_program SET id_lembaga = ? WHERE id = ? AND id_lembaga IS NULL");
        foreach ($pdo->query("SELECT id, nama_lembaga FROM lms_program WHERE id_lembaga IS NULL AND nama_lembaga IS NOT NULL AND nama_lembaga <> ''")->fetchAll() as $r) {
            $k = mb_strtolower(trim($r['nama_lembaga']));
            if (!isset($perNama[$k])) continue;
            try { $up->execute([$perNama[$k], $r['id']]); } catch (Exception $e) { /* id sudah dipakai kelas lain */ }
        }
        $un = $pdo->prepare("UPDATE lms_program SET nama = ? WHERE id = ?");
        foreach ($pdo->query("SELECT id, nama, id_lembaga FROM lms_program WHERE id_lembaga IS NOT NULL")->fetchAll() as $r)
            if (isset($nama[(int) $r['id_lembaga']]) && $nama[(int) $r['id_lembaga']] !== $r['nama']) $un->execute([$nama[(int) $r['id_lembaga']], $r['id']]);
        if ($buat) {
            $terhubung = array_flip(array_map('intval', array_keys(petaProgram($pdo))));
            $in = $pdo->prepare("INSERT INTO lms_program (id,nama,kategori,tujuan,deskripsi,periode,angkatan,kuota,status,kode_kelas,fasilitator,pengumuman,urutan,nama_lembaga,id_lembaga) VALUES (?,?,'Digital','','','Triwulanan','',30,'buka',?,'Tim fasilitator PERI','',0,?,?)");
            foreach ($kat as $p) {
                if (isset($terhubung[$p['id']])) continue;
                try { $in->execute(['L' . $p['id'], mb_substr($p['nama'], 0, 150), 'LMS' . $p['id'], mb_strtolower(trim($p['nama'])), $p['id']]); }
                catch (Exception $e) { /* id atau kode sudah ada: dilewati */ }
            }
        }
    } catch (Exception $e) { /* dilewati; tidak mengganggu aplikasi */ }
}

// Menyamakan keanggotaan kelas satu pengguna dengan pendaftarannya di lembaga.
// Aturan: pendaftaran berstatus diterima => masuk kelas (satu kelas saja, yang paling awal terdaftar);
// konfirmasi dibatalkan => akses dinonaktifkan; status selesai tidak diubah.
// Mengembalikan daftar pendaftaran pengguna itu: [['prog' => id kelas atau null, 'program' => nama, 'status' => baru|diterima], ...]
function sinkronKelas($pdo, $uid, $periId, $peta, $baris = null) {
    if ($baris === null) $baris = ambilPendaftaran($periId);
    if ($baris === null) return []; // Flask tidak terjangkau: jangan mengubah keanggotaan kelas
    $daftar = []; $diterima = [];
    foreach ($baris as $b) {
        $pg = $peta[(int) ($b['program_id'] ?? 0)] ?? null;
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
    $semuaBaris = $m->fetchAll();
    $punya = []; $kelola = []; // kelola = keanggotaan aktif/nonaktif; yang selesai tidak pernah diubah
    foreach ($semuaBaris as $r) { $punya[$r['program_id']] = true; if ($r['status'] !== 'selesai') $kelola[$r['program_id']] = $r['status']; }
    $terdaftar = []; foreach ($daftar as $d) if ($d['prog'] !== null) $terdaftar[$d['prog']] = $d['status'];

    if ($diterima) {
        $sudahDiterima = array_intersect(array_keys($kelola), $diterima);
        if ($sudahDiterima) {
            foreach ($sudahDiterima as $pg) if ($kelola[$pg] === 'nonaktif')
                $pdo->prepare("UPDATE lms_peserta_program SET status = 'aktif' WHERE user_id = ? AND program_id = ?")->execute([$uid, $pg]);
        } else {
            $baru = null; foreach ($diterima as $pg) if (!isset($punya[$pg])) { $baru = $pg; break; }
            if ($baru !== null) {
                foreach (array_keys($kelola) as $pg) $pdo->prepare("DELETE FROM lms_peserta_program WHERE user_id = ? AND program_id = ?")->execute([$uid, $pg]);
                $pdo->prepare("INSERT INTO lms_peserta_program (program_id, user_id, status, bergabung_pada) VALUES (?, ?, 'aktif', ?)")->execute([$baru, $uid, date('Y-m-d H:i:s')]);
            }
        }
    } else {
        // Dinonaktifkan hanya kalau kelas itu memang terhubung ke pendaftarannya yang sudah tidak berstatus diterima.
        foreach ($kelola as $pg => $st)
            if ($st === 'aktif' && isset($terdaftar[$pg]))
                $pdo->prepare("UPDATE lms_peserta_program SET status = 'nonaktif' WHERE user_id = ? AND program_id = ?")->execute([$uid, $pg]);
    }
    return $daftar;
}

// Dipanggil setiap data dimuat: akun peserta yang sudah diterima dibuatkan otomatis, lalu kelas disamakan.
// Kalau database lembaga belum ada atau Flask belum pernah dijalankan, bagian ini dilewati tanpa mengganggu aplikasi.
// Hasil: daftar pendaftaran untuk ditampilkan: [['pid' => ..., 'prog' => ..., 'program' => ..., 'status' => ...], ...]
function sinkronSemua($pdo, $buatKelas = false) {
    $hasil = [];
    $semua = ambilPendaftaran();
    if ($semua === null) return [];
    sinkronProgram($pdo, $buatKelas);
    try {
        $per = [];
        foreach ($semua as $b) $per[(int) $b['user_id']][] = $b;
        foreach ($per as $periId => $rows)
            foreach ($rows as $b) if ($b['status'] === 'diterima') { pastikanPengguna($pdo, $periId, $b['email']); break; }
        $peta = petaProgram($pdo);
        foreach ($pdo->query("SELECT id, peri_user_id FROM users WHERE peri_user_id IS NOT NULL AND role = 'peserta'")->fetchAll() as $u) {
            foreach (sinkronKelas($pdo, (int) $u['id'], (int) $u['peri_user_id'], $peta, $per[(int) $u['peri_user_id']] ?? []) as $d)
                $hasil[] = ['pid' => pidDari($u['id']), 'prog' => $d['prog'], 'program' => $d['program'], 'status' => $d['status']];
        }
    } catch (Exception $e) { return []; }
    return $hasil;
}
