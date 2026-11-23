<?php
// Memberi token CSRF untuk formulir login. Hanya GET.
require __DIR__ . '/guard.php';
keluar(['ok' => true, 'csrf' => tokenCsrf()]);
