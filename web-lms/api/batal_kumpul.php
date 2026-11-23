<?php
// Peserta membatalkan pengumpulan tugasnya sendiri (isian dan berkas ikut dihapus). Hanya POST (JSON: prog, id).
require __DIR__ . '/db.php';
require __DIR__ . '/berkas.php';
require __DIR__ . '/guard.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') keluar(['ok' => false, 'pesan' => 'Hanya POST'], 405);
$sesi = wajibPeran('peserta');
wajibCsrfHeader();

$d = json_decode(file_get_contents('php://input'), true) ?: [];
$tid = (string) ($d['prog'] ?? '') . '-' . (string) ($d['id'] ?? '');
$uid = idDari($sesi['uid']);
$pdo = koneksi();

$st = $pdo->prepare("SELECT path FROM lms_pengumpulan_item WHERE tugas_id = ? AND user_id = ?");
$st->execute([$tid, $uid]);
$path = array_column($st->fetchAll(), 'path');
$st = $pdo->prepare("SELECT path_berkas FROM lms_pengumpulan WHERE tugas_id = ? AND user_id = ?");
$st->execute([$tid, $uid]);
$g = $st->fetch();
if ($g && $g['path_berkas']) $path[] = $g['path_berkas'];

$pdo->prepare("DELETE FROM lms_pengumpulan_item WHERE tugas_id = ? AND user_id = ?")->execute([$tid, $uid]);
$pdo->prepare("DELETE FROM lms_pengumpulan WHERE tugas_id = ? AND user_id = ?")->execute([$tid, $uid]);
foreach (array_unique($path) as $p) if ($p) hapusBerkas('tugas', $p);
keluar(['ok' => true]);
