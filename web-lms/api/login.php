<?php
// Memeriksa email dan kata sandi terhadap hash di tabel users. Hanya POST.
require __DIR__ . '/db.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') keluar(['ok' => false, 'pesan' => 'Hanya POST'], 405);
$d = json_decode(file_get_contents('php://input'), true) ?: [];
$em = strtolower(trim((string) ($d['email'] ?? '')));
$pw = (string) ($d['pw'] ?? '');
$peran = ($d['peran'] ?? '') === 'admin' ? 'admin' : 'peserta';

$pdo = koneksi();
$st = $pdo->prepare("SELECT id, password_hash FROM users WHERE LOWER(email) = ? AND role = ?");
$st->execute([$em, $peran]);
$u = $st->fetch();
if (!$u || !password_verify($pw, $u['password_hash'])) keluar(['ok' => false]);
keluar(['ok' => true, 'id' => pidDari($u['id'])]);