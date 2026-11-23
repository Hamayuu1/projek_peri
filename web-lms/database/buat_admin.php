<?php
// Membuat atau mengganti kata sandi admin LMS. Hanya dari terminal:  php database/buat_admin.php email@contoh.com
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../api/db.php';

$em = strtolower(trim($argv[1] ?? ''));
if (!filter_var($em, FILTER_VALIDATE_EMAIL)) { fwrite(STDERR, "Pemakaian: php database/buat_admin.php email@contoh.com\n"); exit(1); }

$win = stripos(PHP_OS, 'WIN') === 0;
echo "Kata sandi (minimal 12 karakter): ";
if (!$win) shell_exec('stty -echo');
$pw = rtrim((string) fgets(STDIN), "\r\n");
if (!$win) { shell_exec('stty echo'); echo "\n"; }
if (strlen($pw) < 12) { fwrite(STDERR, "Kata sandi terlalu pendek.\n"); exit(1); }

$algo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT;
$hash = password_hash($pw, $algo);
$pdo = koneksi();
$st = $pdo->prepare("SELECT id FROM lms_admin WHERE email = ?");
$st->execute([$em]);
if ($st->fetch()) {
    $pdo->prepare("UPDATE lms_admin SET password_hash = ? WHERE email = ?")->execute([$hash, $em]);
    echo "Kata sandi admin $em diperbarui.\n";
} else {
    $pdo->prepare("INSERT INTO lms_admin (email, password_hash) VALUES (?, ?)")->execute([$em, $hash]);
    echo "Admin $em dibuat.\n";
}
