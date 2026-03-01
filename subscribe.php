<?php
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$token = $input['token'] ?? '';

if (!$token) {
    http_response_code(400);
    echo json_encode(['error' => 'Token manquant']);
    exit;
}

function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function getFcmAccessToken(array $sa): string {
    $now    = time();
    $header = base64url_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $claims = base64url_encode(json_encode([
        'iss'   => $sa['client_email'],
        'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
        'aud'   => 'https://oauth2.googleapis.com/token',
        'iat'   => $now,
        'exp'   => $now + 3600,
    ]));

    $toSign = "$header.$claims";
    openssl_sign($toSign, $sig, $sa['private_key'], 'SHA256');
    $jwt = $toSign . '.' . base64url_encode($sig);

    $ctx = stream_context_create(['http' => [
        'method'  => 'POST',
        'header'  => 'Content-Type: application/x-www-form-urlencoded',
        'content' => http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion'  => $jwt,
        ]),
    ]]);

    $resp = file_get_contents('https://oauth2.googleapis.com/token', false, $ctx);
    return json_decode($resp, true)['access_token'];
}

$saPath      = __DIR__ . '/nomadic-rush-162313-firebase-adminsdk-o619m-42a9abfa60.json';
$sa          = json_decode(file_get_contents($saPath), true);
$accessToken = getFcmAccessToken($sa);

// Abonnement au topic 'new-posts' via l'API IID avec OAuth2 (service account)
$url = 'https://iid.googleapis.com/iid/v1/' . $token . '/rel/topics/new-posts';

$ctx = stream_context_create(['http' => [
    'method'        => 'POST',
    'header'        => implode("\r\n", [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $accessToken,
        'access_token_auth: true',
        'Content-Length: 0',
    ]),
    'content'       => '',
    'ignore_errors' => true,
]]);

$response = file_get_contents($url, false, $ctx);

if ($response === false) {
    $error = error_get_last();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $error['message'] ?? 'Erreur inconnue']);
    exit;
}

// L'API IID renvoie {} en cas de succès
$decoded = json_decode($response, true);
if (isset($decoded['error'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $decoded['error']]);
    exit;
}

echo json_encode(['success' => true]);
