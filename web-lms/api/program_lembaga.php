<?php
// Daftar program ([id, nama]) di situs lembaga, untuk pilihan "Terhubung ke program situs lembaga" di panel admin. Hanya admin, hanya GET.
require __DIR__ . '/db.php';
require __DIR__ . '/lembaga.php';
require __DIR__ . '/guard.php';
wajibPeran('admin');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') keluar(['ok' => false, 'pesan' => 'Hanya GET'], 405);

$kat = ambilProgramLembaga();
if ($kat === null) keluar(['ok' => false, 'pesan' => 'Daftar program situs lembaga tidak dapat dimuat.'], 502);
keluar(['ok' => true, 'program' => $kat]);
