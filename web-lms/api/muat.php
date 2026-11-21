<?php
// Membaca seluruh data LMS dari MySQL dan mengirimnya dalam bentuk yang dipakai aplikasi (db.peserta, db.programs, dst).
require __DIR__ . '/db.php';
require __DIR__ . '/guard.php';
$sesi = wajibLogin();
$pdo = koneksi();
require __DIR__ . '/lembaga.php';
require __DIR__ . '/berkas.php';
$dftLembaga = sinkronSemua($pdo);

// Peserta hanya menerima datanya sendiri. Kelas yang bukan miliknya hanya menampilkan info dasar (tanpa sesi, tugas, daftar peserta).
function batasiPeserta($o, $me) {
    $o['peserta'] = array_values(array_filter($o['peserta'], function ($p) use ($me) { return $p['id'] === $me; }));
    foreach ($o['programs'] as &$p) {
        $p['nPeserta'] = count($p['peserta']);
        if (in_array($me, $p['peserta'], true)) {
            $p['peserta'] = [$me];
            $p['selesai'] = array_values(array_intersect($p['selesai'], [$me]));
            foreach ($p['sesi'] as &$s) $s['hadir'] = array_values(array_intersect($s['hadir'], [$me]));
            unset($s);
            $k = [];
            foreach ((array) $p['kumpul'] as $tid => $m) if (isset($m[$me])) $k[$tid] = [$me => $m[$me]];
            $p['kumpul'] = (object) $k;
        } else {
            $p['peserta'] = []; $p['selesai'] = []; $p['sesi'] = []; $p['tugas'] = []; $p['ann'] = ''; $p['kumpul'] = (object) [];
            unset($p['sertif']);
        }
    }
    unset($p);
    $o['undangan'] = array_values(array_filter($o['undangan'], function ($u) use ($me) { return $u['pid'] === $me; }));
    $o['pendaftaran'] = array_values(array_filter($o['pendaftaran'], function ($u) use ($me) { return $u['pid'] === $me; }));
    $o['pendaftaranLembaga'] = array_values(array_filter($o['pendaftaranLembaga'], function ($u) use ($me) { return $u['pid'] === $me; }));
    return $o;
}

try {
    $peserta = [];
    $q = $pdo->query("SELECT u.id, u.email, COALESCE(pr.nama_lengkap, u.email) AS nama
                      FROM users u LEFT JOIN lms_profil pr ON pr.user_id = u.id
                      WHERE u.role = 'peserta' ORDER BY u.id");
    foreach ($q as $r) $peserta[] = ['id' => pidDari($r['id']), 'nama' => $r['nama'], 'email' => $r['email']];

    $progs = [];
    $q = $pdo->query("SELECT * FROM lms_program ORDER BY urutan, id");
    foreach ($q as $r) {
        $progs[$r['id']] = [
            'id' => $r['id'], 'nama' => $r['nama'], 'kategori' => $r['kategori'], 'tujuan' => (string) $r['tujuan'],
            'periode' => (string) $r['periode'], 'angkatan' => (string) $r['angkatan'], 'kuota' => (int) $r['kuota'],
            'status' => $r['status'], 'kode' => $r['kode_kelas'], 'fas' => (string) $r['fasilitator'],
            'desc' => (string) $r['deskripsi'], 'ann' => (string) $r['pengumuman'],
            'peserta' => [], 'selesai' => [], 'sesi' => [], 'tugas' => [], 'kumpul' => (object) [],
        ];
    }
    $kumpul = [];

    foreach ($pdo->query("SELECT program_id, user_id, status FROM lms_peserta_program WHERE status <> 'nonaktif' ORDER BY bergabung_pada, user_id") as $r) {
        if (!isset($progs[$r['program_id']])) continue;
        $progs[$r['program_id']]['peserta'][] = pidDari($r['user_id']);
        if ($r['status'] === 'selesai') $progs[$r['program_id']]['selesai'][] = pidDari($r['user_id']);
    }

    $sesiIdx = [];
    foreach ($pdo->query("SELECT * FROM lms_sesi ORDER BY program_id, no") as $r) {
        if (!isset($progs[$r['program_id']])) continue;
        $s = [
            'id' => $r['id'], 'no' => (int) $r['no'], 'judul' => $r['judul'], 'tanggal' => substr($r['tanggal'], 0, 10),
            'jam' => str_replace(':', '.', substr($r['jam_mulai'], 0, 5)) . '-' . str_replace(':', '.', substr($r['jam_selesai'], 0, 5)),
            'mode' => $r['mode'], 'tempat' => (string) $r['tempat'],
            'materi' => $r['materi_nama'] !== null && $r['materi_nama'] !== '' ? ['nama' => $r['materi_nama'], 'kb' => (int) $r['materi_kb'], 'tipe' => $r['materi_tipe'], 'url' => $r['materi_url'], 'ref' => refDari($r['materi_tipe'], $r['materi_path'], $r['materi_url'])] : null,
            'hadir' => [],
        ];
        $progs[$r['program_id']]['sesi'][] = $s;
        $sesiIdx[$r['id']] = [$r['program_id'], count($progs[$r['program_id']]['sesi']) - 1];
    }

    foreach ($pdo->query("SELECT sesi_id, user_id FROM lms_kehadiran ORDER BY user_id") as $r) {
        if (!isset($sesiIdx[$r['sesi_id']])) continue;
        [$pid, $i] = $sesiIdx[$r['sesi_id']];
        $progs[$pid]['sesi'][$i]['hadir'][] = pidDari($r['user_id']);
    }

    foreach ($pdo->query("SELECT * FROM lms_tugas ORDER BY program_id, sesi_no, id") as $r) {
        if (!isset($progs[$r['program_id']])) continue;
        $pre = $r['program_id'] . '-';
        $tid = strpos($r['id'], $pre) === 0 ? substr($r['id'], strlen($pre)) : $r['id'];
        $progs[$r['program_id']]['tugas'][] = ['id' => $tid, 'sesi' => (int) $r['sesi_no'], 'judul' => $r['judul'], 'due' => substr($r['tenggat'], 0, 10), 'desc' => (string) $r['deskripsi']];
    }

    $itemMap = [];
    foreach ($pdo->query("SELECT tugas_id, user_id, tipe, nama, path, url, kb FROM lms_pengumpulan_item ORDER BY urutan") as $r)
        $itemMap[$r['tugas_id'] . '|' . $r['user_id']][] = ['nama' => $r['nama'], 'tipe' => $r['tipe'], 'url' => $r['url'], 'ref' => refDari($r['tipe'], $r['path'], $r['url']), 'kb' => (int) $r['kb']];
    foreach ($pdo->query("SELECT g.*, t.program_id FROM lms_pengumpulan g JOIN lms_tugas t ON t.id = g.tugas_id") as $r) {
        $pre = $r['program_id'] . '-';
        $tid = strpos($r['tugas_id'], $pre) === 0 ? substr($r['tugas_id'], strlen($pre)) : $r['tugas_id'];
        $its = $itemMap[$r['tugas_id'] . '|' . $r['user_id']] ?? [];
        $nama = $its ? $its[0]['nama'] . (count($its) > 1 ? ' (+' . (count($its) - 1) . ')' : '') : (string) $r['nama_berkas'];
        $kumpul[$r['program_id']][$tid][pidDari($r['user_id'])] = ['file' => $nama, 'at' => substr($r['dikumpul_pada'], 0, 16), 'catatan' => (string) $r['catatan'], 'items' => $its];
    }
    foreach ($kumpul as $pid => $v) $progs[$pid]['kumpul'] = $v;

    foreach ($pdo->query("SELECT * FROM lms_sertifikat_template") as $r) {
        if (!isset($progs[$r['program_id']]) || empty($r['gambar'])) continue;
        $progs[$r['program_id']]['sertif'] = [
            'img' => $r['gambar'], 'w' => (int) $r['lebar'], 'h' => (int) $r['tinggi'],
            'x' => (float) $r['pos_x'], 'y' => (float) $r['pos_y'], 'size' => (float) $r['ukuran'],
            'color' => $r['warna'], 'weight' => (int) $r['ketebalan'], 'caps' => (bool) $r['kapital'],
        ];
    }

    $und = [];
    foreach ($pdo->query("SELECT d.id, d.user_id, d.dari, d.status, p.kode_kelas FROM lms_undangan d JOIN lms_program p ON p.id = d.program_id ORDER BY d.id") as $r)
        $und[] = ['id' => 'u' . $r['id'], 'kode' => $r['kode_kelas'], 'pid' => pidDari($r['user_id']), 'dari' => (string) $r['dari'], 'status' => $r['status']];

    $dft = [];
    foreach ($pdo->query("SELECT * FROM lms_pendaftaran ORDER BY id") as $r)
        $dft[] = ['id' => 'r' . $r['id'], 'pid' => pidDari($r['user_id']), 'prog' => $r['program_id'], 'tgl' => substr($r['created_at'], 0, 10), 'status' => $r['status'] === 'diterima' ? 'disetujui' : $r['status'], 'alasan' => (string) $r['alasan']];

    $out = ['me' => ['peran' => $sesi['peran'], 'csrf' => tokenCsrf()], 'peserta' => $peserta, 'programs' => array_values($progs), 'undangan' => $und, 'pendaftaran' => $dft, 'pendaftaranLembaga' => $dftLembaga];
    keluar($sesi['peran'] === 'admin' ? $out : batasiPeserta($out, $sesi['uid']));
} catch (Exception $e) {
    keluar(['ok' => false, 'pesan' => 'Gagal membaca data: ' . $e->getMessage()], 500);
}