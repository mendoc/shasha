<?php
header('Content-Type: application/json');

$input       = json_decode(file_get_contents('php://input'), true);
$postKey     = $input['postKey']     ?? '';
$texte       = $input['texte']       ?? '';
$senderToken = $input['senderToken'] ?? '';

if (!$postKey || !$texte) {
    http_response_code(400);
    echo json_encode(['error' => 'postKey et texte requis']);
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

$saPath = __DIR__ . '/nomadic-rush-162313-firebase-adminsdk-o619m-42a9abfa60.json';
$sa     = json_decode(file_get_contents($saPath), true);
$token  = getFcmAccessToken($sa);

// Message data-only : Firebase ne montre rien automatiquement.
// C'est le SW (onBackgroundMessage) ou la page (onMessage) qui gère l'affichage.
$payload = [
    'message' => [
        'topic' => 'new-posts',
        'data'  => [
            'postKey'     => $postKey,
            'texte'       => $texte,
            'senderToken' => $senderToken,
        ],
    ],
];

$ctx = stream_context_create(['http' => [
    'method'        => 'POST',
    'header'        => implode("\r\n", [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $token,
    ]),
    'content'       => json_encode($payload),
    'ignore_errors' => true,
]]);

$url    = 'https://fcm.googleapis.com/v1/projects/' . $sa['project_id'] . '/messages:send';
$result = file_get_contents($url, false, $ctx);

echo $result !== false ? $result : json_encode(['error' => 'Erreur envoi FCM']);
