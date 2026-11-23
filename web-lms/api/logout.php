<?php
// Mengakhiri sesi (admin maupun peserta). Hanya POST.
require __DIR__ . '/db.php';
require __DIR__ . '/guard.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') keluar(['ok' => false, 'pesan' => 'Hanya POST'], 405);
mulaiSesi();
if (!empty($_SESSION['peran'])) wajibCsrfHeader(); // tanpa sesi tidak ada yang perlu dilindungi
akhiriSesi();
keluar(['ok' => true]);
