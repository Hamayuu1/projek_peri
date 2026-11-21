<?php
// Sesi PHP untuk LMS: cookie HttpOnly + SameSite, batas diam 2 jam, ID diganti saat login, token CSRF.
require_once __DIR__ . '/db.php';

function mulaiSesi() {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_name('lms_sesi');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Lax']);
    session_start();
    if (isset($_SESSION['aktif']) && time() - $_SESSION['aktif'] > 7200) {
        $_SESSION = [];
        session_regenerate_id(true);
    }
    $_SESSION['aktif'] = time();
}

function masukSesi($peran, $uid) {
    mulaiSesi();
    session_regenerate_id(true);
    $_SESSION = ['peran' => $peran, 'uid' => $uid, 'aktif' => time(), 'csrf' => bin2hex(random_bytes(32))];
    return $_SESSION['csrf'];
}

function akhiriSesi() {
    mulaiSesi();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => $p['path'], 'secure' => $p['secure'], 'httponly' => true, 'samesite' => 'Lax']);
    }
    session_destroy();
}

function tokenCsrf() {
    mulaiSesi();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

function cekCsrf($t) {
    mulaiSesi();
    return !empty($_SESSION['csrf']) && is_string($t) && hash_equals($_SESSION['csrf'], $t);
}
