<?php
// Kredensial dibaca dari berkas .env (tidak ikut ke GitHub). Salin .env.example menjadi .env lalu isi.
// Disarankan menaruh .env di luar folder web, lalu menunjuknya lewat variabel lingkungan PERI_LMS_ENV.
function bacaEnv($berkas) {
    $h = [];
    if (!is_file($berkas) || !is_readable($berkas)) return $h;
    foreach (file($berkas, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $baris) {
        $baris = trim($baris);
        if ($baris === '' || $baris[0] === '#' || strpos($baris, '=') === false) continue;
        [$k, $v] = explode('=', $baris, 2);
        $v = trim($v);
        if (strlen($v) >= 2 && ($v[0] === '"' || $v[0] === "'") && substr($v, -1) === $v[0]) $v = substr($v, 1, -1);
        $h[trim($k)] = $v;
    }
    return $h;
}

$ENV_LMS = bacaEnv(getenv('PERI_LMS_ENV') ?: dirname(__DIR__) . '/.env');
if (!$ENV_LMS && !getenv('PERI_DSN')) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode(['ok' => false, 'pesan' => 'Berkas .env belum dibuat. Salin .env.example menjadi .env lalu isi kredensial database.']);
    exit;
}

$LMS = [
    'host' => $ENV_LMS['LMS_DB_HOST'] ?? '127.0.0.1',
    'port' => (int) ($ENV_LMS['LMS_DB_PORT'] ?? 3306),
    'db'   => $ENV_LMS['LMS_DB_NAME'] ?? 'peri_lms',
    'user' => $ENV_LMS['LMS_DB_USER'] ?? '',
    'pass' => $ENV_LMS['LMS_DB_PASS'] ?? '',
];
