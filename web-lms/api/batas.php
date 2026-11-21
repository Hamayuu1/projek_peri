<?php
// Pembatas percobaan login: 5 kegagalan berturut-turut pada satu email atau satu alamat IP = diblokir 5 menit.
const BATAS_GAGAL = 5;
const BLOK_DETIK = 300;
const JENDELA_DETIK = 900;

function kunciBatas($email) {
    return ['e:' . hash('sha256', strtolower($email)), 'i:' . substr(hash('sha256', $_SERVER['REMOTE_ADDR'] ?? '?'), 0, 64)];
}

function sisaTunggu($pdo, $kunci) {
    $maks = 0;
    $st = $pdo->prepare("SELECT blok_sampai FROM lms_percobaan_login WHERE kunci = ?");
    foreach ($kunci as $k) {
        $st->execute([$k]);
        $r = $st->fetch();
        if ($r && $r['blok_sampai']) $maks = max($maks, strtotime($r['blok_sampai']) - time());
    }
    return $maks;
}

function catatGagal($pdo, $kunci) {
    $sel = $pdo->prepare("SELECT jumlah, mulai_pada, blok_sampai FROM lms_percobaan_login WHERE kunci = ?");
    $rep = $pdo->prepare("REPLACE INTO lms_percobaan_login (kunci, jumlah, mulai_pada, blok_sampai) VALUES (?, ?, ?, ?)");
    foreach ($kunci as $k) {
        $sel->execute([$k]);
        $r = $sel->fetch();
        $baru = !$r || time() - strtotime($r['mulai_pada']) > JENDELA_DETIK || ($r['blok_sampai'] && strtotime($r['blok_sampai']) <= time());
        $n = $baru ? 1 : (int) $r['jumlah'] + 1;
        $mulai = $baru ? date('Y-m-d H:i:s') : $r['mulai_pada'];
        $blok = $n >= BATAS_GAGAL ? date('Y-m-d H:i:s', time() + BLOK_DETIK) : null;
        $rep->execute([$k, $n, $mulai, $blok]);
    }
}

function hapusGagal($pdo, $kunci) {
    $pdo->prepare("DELETE FROM lms_percobaan_login WHERE kunci = ?")->execute([$kunci[0]]);
}
