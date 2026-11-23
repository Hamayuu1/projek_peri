<?php
// Login ADMIN LMS (tabel lms_admin). Peserta masuk lewat login_lembaga.php. Hanya POST.
// Perlindungan: token CSRF, batas 5 percobaan lalu tunggu 5 menit, hash kuat (Argon2id/bcrypt), pesan galat seragam.
require __DIR__ . '/db.php';
require __DIR__ . '/guard.php';
require __DIR__ . '/batas.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') keluar(['ok' => false, 'pesan' => 'Hanya POST'], 405);

$d = json_decode(file_get_contents('php://input'), true) ?: [];
if (!cekCsrf($d['csrf'] ?? null)) keluar(['ok' => false, 'pesan' => 'Sesi halaman kedaluwarsa. Muat ulang halaman lalu coba lagi.'], 403);

$em = strtolower(trim((string) ($d['email'] ?? '')));
$pw = (string) ($d['pw'] ?? '');
if ($em === '' || $pw === '' || strlen($em) > 120 || strlen($pw) > 200) keluar(['ok' => false, 'pesan' => 'Email atau kata sandi salah.'], 401);

$pdo = koneksi();
$kunci = kunciBatas($em);
$tunggu = sisaTunggu($pdo, $kunci);
if ($tunggu > 0) keluar(['ok' => false, 'pesan' => 'Terlalu banyak percobaan. Coba lagi dalam ' . ceil($tunggu / 60) . ' menit.'], 429);

$algo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT;
$st = $pdo->prepare("SELECT id, password_hash FROM lms_admin WHERE email = ?");
$st->execute([$em]);
$a = $st->fetch();
// Kalau email tidak ada, tetap memeriksa hash palsu agar waktu respons sama.
$hash = $a ? $a['password_hash'] : password_hash('tidak-dipakai', $algo);
$benar = password_verify($pw, $hash) && $a;

if (!$benar) {
    catatGagal($pdo, $kunci);
    keluar(['ok' => false, 'pesan' => 'Email atau kata sandi salah.'], 401);
}
if (password_needs_rehash($a['password_hash'], $algo))
    $pdo->prepare("UPDATE lms_admin SET password_hash = ? WHERE id = ?")->execute([password_hash($pw, $algo), $a['id']]);
hapusGagal($pdo, $kunci);
$csrf = masukSesi('admin', 'a' . $a['id']);
keluar(['ok' => true, 'id' => 'a' . $a['id'], 'csrf' => $csrf]);
