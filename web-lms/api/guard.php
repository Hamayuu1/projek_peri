<?php
// Pemeriksa akses. Panggil wajibLogin() atau wajibPeran('admin'|'peserta') di awal setiap endpoint yang memerlukan login.
require_once __DIR__ . '/sesi.php';
mulaiSesi();

function wajibLogin() {
    if (empty($_SESSION['peran']) || empty($_SESSION['uid']))
        keluar(['ok' => false, 'login' => true, 'pesan' => 'Silakan login terlebih dahulu.'], 401);
    return ['peran' => $_SESSION['peran'], 'uid' => $_SESSION['uid']];
}

function wajibPeran($peran) {
    $s = wajibLogin();
    if ($s['peran'] !== $peran) keluar(['ok' => false, 'pesan' => 'Anda tidak memiliki akses.'], 403);
    return $s;
}
