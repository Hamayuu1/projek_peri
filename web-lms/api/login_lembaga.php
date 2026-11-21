<?php
// Login peserta memakai akun web lembaga: email dan kata sandi diperiksa oleh server Flask lembaga.
// Kalau benar, akun LMS dibuat atau dicocokkan, lalu kelasnya disamakan dengan pendaftaran. Hanya POST.
require __DIR__ . '/db.php';
require __DIR__ . '/lembaga.php';
require __DIR__ . '/guard.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') keluar(['ok' => false, 'pesan' => 'Hanya POST'], 405);
$d = json_decode(file_get_contents('php://input'), true) ?: [];
if (!cekCsrf($d['csrf'] ?? null)) keluar(['ok' => false, 'pesan' => 'Sesi halaman kedaluwarsa. Muat ulang halaman lalu coba lagi.'], 403);
$em = strtolower(trim((string) ($d['email'] ?? '')));
$pw = (string) ($d['pw'] ?? '');
if ($em === '' || $pw === '') keluar(['ok' => false]);

$r = panggilFlask('/api/auth/login', ['email' => $em, 'password' => $pw]);
if ($r === null) keluar(['ok' => false, 'pesan' => 'Server login lembaga belum berjalan. Jalankan peri-backend (python app.py).'], 503);
[$kode, $j] = $r;
$u = is_array($j) ? ($j['user'] ?? null) : null;
if ($kode !== 200 || !is_array($u) || ($u['role'] ?? '') !== 'pendaftar') keluar(['ok' => false]);

$pdo = koneksi();
$uid = pastikanPengguna($pdo, (int) $u['id'], $u['email']);
if ($uid === null) keluar(['ok' => false, 'pesan' => 'Akun tidak dapat dihubungkan ke LMS.'], 409);
try { sinkronKelas($pdo, $uid, (int) $u['id'], petaProgram($pdo)); } catch (Exception $e) { /* database lembaga belum siap: lewati */ }
$csrf = masukSesi('peserta', pidDari($uid));
keluar(['ok' => true, 'id' => pidDari($uid), 'csrf' => $csrf]);