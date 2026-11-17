<?php
require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function keluar($data, $kode = 200) {
    http_response_code($kode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function koneksi() {
    global $LMS;
    // PERI_DSN hanya dipakai untuk pengujian; di Laragon biarkan kosong.
    $dsn = getenv('PERI_DSN') ?: "mysql:host={$LMS['host']};port={$LMS['port']};dbname={$LMS['db']};charset=utf8mb4";
    try {
        $pdo = new PDO($dsn, $LMS['user'], $LMS['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        if (strpos($dsn, 'sqlite') === 0) $pdo->exec('PRAGMA foreign_keys = ON');
        return $pdo;
    } catch (Exception $e) {
        keluar(['ok' => false, 'pesan' => 'Tidak bisa terhubung ke database. Pastikan MySQL Laragon berjalan dan peri_lms sudah diimpor.'], 500);
    }
}

function pidDari($id) { return 'p' . $id; }
function idDari($pid) { return (int) ltrim((string) $pid, 'p'); }