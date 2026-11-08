<?php
/**
 * Painel do site — Elisa Vasconcelos
 * --------------------------------------------------------------
 * Este arquivo só funciona em hospedagens com PHP (Hostinger, HostGator,
 * Locaweb, KingHost, etc.). Ele deixa o painel salvar textos e fotos
 * direto no site publicado, protegido por senha.
 *
 * Esqueceu a senha? Pelo gerenciador de arquivos da hospedagem, apague
 * o arquivo  admin/data/auth.php  e abra o painel de novo para criar outra.
 */

declare(strict_types=1);

date_default_timezone_set('America/Sao_Paulo');

const MAX_CONTENT_BYTES = 2 * 1024 * 1024;   // 2 MB de texto
const MAX_UPLOAD_BYTES  = 15 * 1024 * 1024;  // 15 MB por foto
const MAX_BACKUPS       = 40;
const LOCK_AFTER        = 6;                 // tentativas erradas
const LOCK_MINUTES      = 15;

$ROOT     = dirname(__DIR__);
$DATA     = __DIR__ . '/data';
$AUTH     = $DATA . '/auth.php';
$ATTEMPTS = $DATA . '/attempts.php';
$BACKUPS  = $DATA . '/backups';
$CONTENT  = $ROOT . '/content/content.js';
$INDEX    = $ROOT . '/index.html';
$PHOTOS   = $ROOT . '/photos';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_name('ev_admin');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
session_start();

function out(array $data, int $code = 200): void { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function fail(string $msg, int $code = 400): void { out(['ok' => false, 'error' => $msg], $code); }

function ensure_data_dir(string $DATA, string $BACKUPS): void {
  if (!is_dir($DATA)) @mkdir($DATA, 0755, true);
  if (!is_dir($BACKUPS)) @mkdir($BACKUPS, 0755, true);
  $ht = $DATA . '/.htaccess';
  if (!file_exists($ht)) @file_put_contents($ht, "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
  if (!file_exists($DATA . '/index.html')) @file_put_contents($DATA . '/index.html', '');
}
function read_auth(string $AUTH): ?array { if (!is_file($AUTH)) return null; $a = include $AUTH; return is_array($a) && !empty($a['hash']) ? $a : null; }
function write_auth(string $AUTH, string $password): bool {
  $hash = password_hash($password, PASSWORD_DEFAULT);
  $php = "<?php\n// Senha do painel (guardada de forma criptografada). Apague este arquivo para criar uma senha nova.\nreturn " . var_export(['hash' => $hash, 'created' => date('c')], true) . ";\n";
  return @file_put_contents($AUTH, $php, LOCK_EX) !== false;
}
function client_key(): string { return hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '?') . '|ev'); }
function read_attempts(string $f): array {
  if (!is_file($f)) return [];
  $raw = (string) @file_get_contents($f);
  $json = substr($raw, strpos($raw, "\n") + 1);
  $d = json_decode($json, true);
  return is_array($d) ? $d : [];
}
function write_attempts(string $f, array $d): void {
  $now = time();
  foreach ($d as $k => $v) if (($v['t'] ?? 0) < $now - 86400) unset($d[$k]);
  @file_put_contents($f, "<?php exit; ?>\n" . json_encode($d), LOCK_EX);
}
function is_logged(): bool { return !empty($_SESSION['ev_ok']) && ($_SESSION['ev_exp'] ?? 0) > time(); }
function touch_session(): void { $_SESSION['ev_exp'] = time() + 60 * 60 * 8; }
function csrf(): string { if (empty($_SESSION['ev_csrf'])) $_SESSION['ev_csrf'] = bin2hex(random_bytes(24)); return $_SESSION['ev_csrf']; }
function require_login(): void {
  if (!is_logged()) fail('Sua sessão expirou. Entre de novo.', 401);
  $h = $_SERVER['HTTP_X_CSRF'] ?? '';
  if (!hash_equals(csrf(), (string) $h)) fail('Pedido inválido. Recarregue a página.', 403);
  touch_session();
}
function json_body(): array {
  $raw = file_get_contents('php://input', false, null, 0, MAX_CONTENT_BYTES + 1);
  if ($raw === false || strlen($raw) > MAX_CONTENT_BYTES) fail('Conteúdo grande demais.');
  $d = json_decode($raw, true);
  if (!is_array($d)) fail('Conteúdo inválido.');
  return $d;
}
function backup_current(string $CONTENT, string $BACKUPS, string $label = ''): void {
  if (!is_file($CONTENT)) return;
  $name = 'content-' . date('Y-m-d_H-i-s') . ($label ? '-' . $label : '') . '.js';
  @copy($CONTENT, $BACKUPS . '/' . $name);
  $files = glob($BACKUPS . '/content-*.js') ?: [];
  sort($files);
  while (count($files) > MAX_BACKUPS) @unlink(array_shift($files));
}
function atomic_write(string $file, string $data): bool {
  $tmp = $file . '.tmp-' . bin2hex(random_bytes(4));
  if (@file_put_contents($tmp, $data, LOCK_EX) === false) return false;
  if (!@rename($tmp, $file)) { @unlink($tmp); return @file_put_contents($file, $data, LOCK_EX) !== false; }
  return true;
}
function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8'); }
function update_meta(string $INDEX, array $content): void {
  if (!is_file($INDEX)) return;
  $html = (string) file_get_contents($INDEX);
  $site = $content['site'] ?? [];
  $title = trim((string) ($site['title'] ?? ''));
  $desc = trim((string) ($site['description'] ?? ''));
  if ($title === '') return;
  $block = "<!--META:START-->\n<title>" . h($title) . "</title>\n"
    . '<meta name="description" content="' . h($desc) . "\">\n"
    . '<meta property="og:title" content="' . h($title) . "\">\n"
    . '<meta property="og:description" content="' . h($desc) . "\">\n<!--META:END-->";
  $new = preg_replace('/<!--META:START-->.*?<!--META:END-->/s', str_replace(['\\', '$'], ['\\\\', '\\$'], $block), $html, 1);
  if (is_string($new) && $new !== $html) atomic_write($INDEX, $new);
}
function content_js(array $content): string {
  return "/* =====================================================================\n"
    . "   CONTEÚDO DO SITE — gerado pelo painel em " . date('d/m/Y H:i') . "\n"
    . "   O jeito fácil de editar é pelo painel: abra  admin/\n"
    . "   ===================================================================== */\n"
    . 'window.SITE_CONTENT = ' . json_encode($content, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ";\n";
}
function ini_bytes(string $v): int {
  $v = trim($v); if ($v === '') return MAX_UPLOAD_BYTES;
  $n = (int) $v; $u = strtolower(substr($v, -1));
  if ($u === 'g') return $n * 1073741824; if ($u === 'm') return $n * 1048576; if ($u === 'k') return $n * 1024;
  return $n > 0 ? $n : MAX_UPLOAD_BYTES;
}
function slug(string $s): string {
  $s = strtolower(trim($s));
  if (function_exists('iconv')) { $t = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s); if ($t !== false) $s = $t; }
  $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
  $s = trim($s, '-');
  return substr($s !== '' ? $s : 'foto', 0, 60);
}

ensure_data_dir($DATA, $BACKUPS);
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'GET' && $method !== 'POST') fail('Método não permitido.', 405);
if ($method === 'POST' && !in_array($action, ['setup', 'login', 'logout', 'save', 'upload', 'password', 'restore'], true)) fail('Ação desconhecida.');

switch ($action) {
  case 'status':
    $logged = is_logged();
    if ($logged) touch_session();
    out([
      'ok' => true, 'server' => true,
      'configured' => read_auth($AUTH) !== null,
      'logged' => $logged,
      'csrf' => $logged ? csrf() : null,
      'writable' => is_writable($ROOT . '/content') && (is_dir($PHOTOS) ? is_writable($PHOTOS) : is_writable($ROOT)),
      'maxUpload' => min(MAX_UPLOAD_BYTES, ini_bytes((string) ini_get('upload_max_filesize')), ini_bytes((string) ini_get('post_max_size'))),
    ]);

  case 'setup':
    if (read_auth($AUTH) !== null) fail('A senha já foi criada.', 409);
    $d = json_body();
    $p = (string) ($d['password'] ?? '');
    if ((function_exists('mb_strlen') ? mb_strlen($p) : strlen($p)) < 8) fail('Use uma senha com pelo menos 8 caracteres.');
    if (!write_auth($AUTH, $p)) fail('Não consegui gravar a senha. Verifique as permissões da pasta admin/data na hospedagem.', 500);
    session_regenerate_id(true);
    $_SESSION['ev_ok'] = true; touch_session();
    out(['ok' => true, 'csrf' => csrf()]);

  case 'login':
    $auth = read_auth($AUTH);
    if ($auth === null) fail('Crie a senha primeiro.', 409);
    $att = read_attempts($ATTEMPTS); $k = client_key(); $now = time();
    $a = $att[$k] ?? ['n' => 0, 't' => 0];
    if ($a['n'] >= LOCK_AFTER && $a['t'] > $now - LOCK_MINUTES * 60) fail('Muitas tentativas. Espere ' . LOCK_MINUTES . ' minutos e tente de novo.', 429);
    if ($a['t'] <= $now - LOCK_MINUTES * 60) $a = ['n' => 0, 't' => $now];
    $d = json_body();
    usleep(300000);
    if (!password_verify((string) ($d['password'] ?? ''), $auth['hash'])) {
      $a['n']++; $a['t'] = $now; $att[$k] = $a; write_attempts($ATTEMPTS, $att);
      fail('Senha incorreta.', 401);
    }
    unset($att[$k]); write_attempts($ATTEMPTS, $att);
    session_regenerate_id(true);
    $_SESSION['ev_ok'] = true; touch_session();
    out(['ok' => true, 'csrf' => csrf()]);

  case 'logout':
    $_SESSION = [];
    session_destroy();
    out(['ok' => true]);

  case 'password':
    require_login();
    $d = json_body();
    $auth = read_auth($AUTH);
    if (!$auth || !password_verify((string) ($d['current'] ?? ''), $auth['hash'])) fail('A senha atual não confere.', 401);
    $p = (string) ($d['password'] ?? '');
    if ((function_exists('mb_strlen') ? mb_strlen($p) : strlen($p)) < 8) fail('Use uma senha com pelo menos 8 caracteres.');
    if (!write_auth($AUTH, $p)) fail('Não consegui gravar a nova senha.', 500);
    out(['ok' => true]);

  case 'save':
    require_login();
    $d = json_body();
    $content = $d['content'] ?? null;
    if (!is_array($content) || !isset($content['site']) || !is_array($content['site'])) fail('Conteúdo inválido.');
    backup_current($CONTENT, $BACKUPS);
    if (!atomic_write($CONTENT, content_js($content))) fail('Não consegui gravar content/content.js. Verifique as permissões na hospedagem.', 500);
    update_meta($INDEX, $content);
    out(['ok' => true, 'savedAt' => date('c')]);

  case 'upload':
    require_login();
    if (empty($_FILES['file']) || !is_array($_FILES['file'])) fail('Nenhuma foto recebida.');
    $f = $_FILES['file'];
    if (($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) fail('A foto não chegou inteira (código ' . (int) $f['error'] . '). Tente uma foto menor.');
    if ($f['size'] > MAX_UPLOAD_BYTES) fail('Foto grande demais.');
    $info = @getimagesize($f['tmp_name']);
    $types = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'];
    if (!$info || !isset($types[$info[2]])) fail('Formato não aceito. Use JPG, PNG ou WebP.');
    $ext = $types[$info[2]];
    if (!is_dir($PHOTOS)) @mkdir($PHOTOS, 0755, true);
    $base = slug(pathinfo((string) ($_POST['name'] ?? $f['name']), PATHINFO_FILENAME));
    $name = $base . '.' . $ext; $i = 2;
    while (file_exists($PHOTOS . '/' . $name)) { $name = $base . '-' . $i++ . '.' . $ext; }
    if (!move_uploaded_file($f['tmp_name'], $PHOTOS . '/' . $name)) fail('Não consegui gravar a foto na pasta photos/.', 500);
    @chmod($PHOTOS . '/' . $name, 0644);
    out(['ok' => true, 'path' => 'photos/' . $name, 'width' => $info[0], 'height' => $info[1]]);

  case 'backups':
    if (!is_logged()) fail('Entre primeiro.', 401);
    $files = glob($BACKUPS . '/content-*.js') ?: [];
    rsort($files);
    out(['ok' => true, 'backups' => array_map(function ($f) { return ['name' => basename($f), 'time' => date('c', (int) filemtime($f)), 'size' => filesize($f)]; }, $files)]);

  case 'restore':
    require_login();
    $d = json_body();
    $name = basename((string) ($d['name'] ?? ''));
    if (!preg_match('/^content-[0-9_-]+(-[a-z]+)?\.js$/', $name) || !is_file($BACKUPS . '/' . $name)) fail('Versão não encontrada.', 404);
    $data = (string) file_get_contents($BACKUPS . '/' . $name);
    backup_current($CONTENT, $BACKUPS, 'antes');
    if (!atomic_write($CONTENT, $data)) fail('Não consegui restaurar.', 500);
    $p = strpos($data, '{'); $q = strrpos($data, '}');
    $json = ($p !== false && $q !== false) ? json_decode(substr($data, $p, $q - $p + 1), true) : null;
    if (is_array($json)) update_meta($INDEX, $json);
    out(['ok' => true]);

  default:
    fail('Ação desconhecida.', 404);
}
