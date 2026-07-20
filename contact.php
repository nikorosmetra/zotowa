<?php
/**
 * Обработчик формы обратной связи.
 * Пароль приложения Яндекс.Почты берётся из переменной окружения SMTP_PASS
 * (задаётся в конфиге php-fpm, а не в этом файле).
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

const SMTP_HOST = 'smtp.yandex.ru';
const SMTP_PORT = 465;
const SMTP_USER = 'zotowa.a.s@yandex.ru';
const MAIL_TO   = 'zotowa.a.s@yandex.ru';
const RATE_DIR  = __DIR__ . '/../contact-throttle'; // вне webroot
const RATE_SECONDS = 30;

function fail(string $message, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail('method_not_allowed', 405);
}

// Honeypot: настоящие пользователи это поле не видят и не заполняют.
if (!empty($_POST['website'] ?? '')) {
    echo json_encode(['ok' => true]);
    exit;
}

$name    = trim((string)($_POST['name'] ?? ''));
$phone   = trim((string)($_POST['phone'] ?? ''));
$email   = trim((string)($_POST['email'] ?? ''));
$practice = trim((string)($_POST['practice'] ?? ''));
$consent = !empty($_POST['consent'] ?? '');

// Защита от инъекции заголовков через переносы строк.
$strip = static fn(string $v): string => str_replace(["\r", "\n"], ' ', $v);
$name = $strip($name);
$phone = $strip($phone);
$email = $strip($email);
$practice = $strip($practice);

if ($name === '' || $phone === '') {
    fail('missing_fields');
}
if (!$consent) {
    fail('consent_required');
}
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail('invalid_email');
}

// Простой троттлинг по IP, чтобы не заспамили форму.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (!is_dir(RATE_DIR)) {
    @mkdir(RATE_DIR, 0700, true);
}
$rateFile = RATE_DIR . '/' . md5($ip) . '.txt';
if (is_dir(RATE_DIR)) {
    $last = @file_get_contents($rateFile);
    if ($last !== false && (time() - (int)$last) < RATE_SECONDS) {
        fail('too_many_requests', 429);
    }
    @file_put_contents($rateFile, (string)time());
}

$smtpPass = getenv('SMTP_PASS');
if ($smtpPass === false || $smtpPass === '') {
    error_log('contact.php: SMTP_PASS is not configured');
    fail('server_misconfigured', 500);
}

$bodyLines = [
    'Новая заявка с сайта zotowa.ru',
    '',
    'Имя: ' . $name,
    'Телефон: ' . $phone,
];
if ($email !== '') {
    $bodyLines[] = 'Email: ' . $email;
}
if ($practice !== '') {
    $bodyLines[] = 'Практика: ' . $practice;
}
$bodyLines[] = '';
$bodyLines[] = 'IP: ' . $ip;
$bodyLines[] = 'Дата: ' . date('d.m.Y H:i:s');
$body = implode("\r\n", $bodyLines);

$subject = '=?UTF-8?B?' . base64_encode('Заявка с сайта: ' . $name) . '?=';

$result = smtp_send(SMTP_HOST, SMTP_PORT, SMTP_USER, $smtpPass, MAIL_TO, $subject, $body, $email);

if ($result !== true) {
    error_log('contact.php smtp error: ' . $result);
    fail('send_failed', 502);
}

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);

/**
 * Минимальный SMTP-клиент поверх TLS. Возвращает true либо текст ошибки.
 */
function smtp_send(
    string $host,
    int $port,
    string $user,
    string $pass,
    string $to,
    string $subject,
    string $body,
    string $replyTo
): bool|string {
    $timeout = 15;
    $socket = @stream_socket_client(
        "ssl://{$host}:{$port}",
        $errno,
        $errstr,
        $timeout,
        STREAM_CLIENT_CONNECT
    );
    if (!$socket) {
        return "connect_failed: {$errstr}";
    }
    stream_set_timeout($socket, $timeout);

    $read = static function () use ($socket): string {
        $data = '';
        while (($line = fgets($socket, 515)) !== false) {
            $data .= $line;
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        return $data;
    };
    $write = static function (string $cmd) use ($socket): void {
        fwrite($socket, $cmd . "\r\n");
    };
    $expect = static function (string $resp, string $code) {
        return str_starts_with($resp, $code);
    };

    $resp = $read();
    if (!$expect($resp, '220')) {
        fclose($socket);
        return "greeting_failed: {$resp}";
    }

    $write('EHLO zotowa.ru');
    $resp = $read();
    if (!$expect($resp, '250')) {
        fclose($socket);
        return "ehlo_failed: {$resp}";
    }

    $write('AUTH LOGIN');
    $resp = $read();
    if (!$expect($resp, '334')) {
        fclose($socket);
        return "auth_start_failed: {$resp}";
    }

    $write(base64_encode($user));
    $resp = $read();
    if (!$expect($resp, '334')) {
        fclose($socket);
        return "auth_user_failed: {$resp}";
    }

    $write(base64_encode($pass));
    $resp = $read();
    if (!$expect($resp, '235')) {
        fclose($socket);
        return "auth_pass_failed: {$resp}";
    }

    $write("MAIL FROM:<{$user}>");
    $resp = $read();
    if (!$expect($resp, '250')) {
        fclose($socket);
        return "mail_from_failed: {$resp}";
    }

    $write("RCPT TO:<{$to}>");
    $resp = $read();
    if (!$expect($resp, '250')) {
        fclose($socket);
        return "rcpt_to_failed: {$resp}";
    }

    $write('DATA');
    $resp = $read();
    if (!$expect($resp, '354')) {
        fclose($socket);
        return "data_start_failed: {$resp}";
    }

    $headers = [
        'From: Зотова и партнёры <' . $user . '>',
        'To: <' . $to . '>',
        'Subject: ' . $subject,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ];
    if ($replyTo !== '') {
        $headers[] = 'Reply-To: <' . $replyTo . '>';
    }

    // Экранируем строки, начинающиеся с точки (SMTP dot-stuffing).
    $escapedBody = preg_replace('/^\./m', '..', $body);
    $message = implode("\r\n", $headers) . "\r\n\r\n" . $escapedBody . "\r\n.";

    $write($message);
    $resp = $read();
    if (!$expect($resp, '250')) {
        fclose($socket);
        return "message_failed: {$resp}";
    }

    $write('QUIT');
    fclose($socket);

    return true;
}
