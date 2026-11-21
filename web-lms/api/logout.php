<?php
// Mengakhiri sesi (admin maupun peserta). Hanya POST.
require __DIR__ . '/db.php';
require __DIR__ . '/guard.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') keluar(['ok' => false, 'pesan' => 'Hanya POST'], 405);
akhiriSesi();
keluar(['ok' => true]);
