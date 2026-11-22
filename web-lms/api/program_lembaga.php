<?php
// Daftar nama program di situs lembaga, untuk pilihan "Terhubung ke program situs lembaga" di panel admin. Hanya admin, hanya GET.
require __DIR__ . '/db.php';
require __DIR__ . '/lembaga.php';
require __DIR__ . '/guard.php';
wajibPeran('admin');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') keluar(['ok' => false, 'pesan' => 'Hanya GET'], 405);

global $LEMBAGA;
$ctx = stream_context_create(['http' => ['method' => 'GET', 'timeout' => 8, 'ignore_errors' => true]]);
$res = @file_get_contents($LEMBAGA['flask'] . '/api/program', false, $ctx);
$j = $res === false ? null : json_decode($res, true);
if (!is_array($j) || !isset($j['program']) || !is_array($j['program']))
    keluar(['ok' => false, 'pesan' => 'Daftar program situs lembaga tidak dapat dimuat.'], 502);

$nama = [];
foreach ($j['program'] as $p) if (!empty($p['nama'])) $nama[] = (string) $p['nama'];
keluar(['ok' => true, 'program' => array_values(array_unique($nama))]);
