<?php
header('Content-Type: application/json');
require_once __DIR__ . '/fcm_config.php';

$input = json_decode(file_get_contents('php://input'), true);
$postKey = $input['postKey'] ?? '';
$texte   = $input['texte']   ?? '';

if (!$postKey || !$texte) {
    http_response_code(400);
    echo json_encode(['error' => 'postKey et texte requis']);
    exit;
}

// Envoi d'une notification au topic FCM 'new-posts'
$corps = mb_strlen($texte) > 100 ? mb_substr($texte, 0, 100) . '…' : $texte;
$message = [
    'to'           => '/topics/new-posts',
    'notification' => [
        'title' => 'Nouveau post',
        'body'  => $corps,
        'icon'  => '/assets/img/logo.png',
    ],
    'data' => [
        'postKey' => $postKey,
        'texte'   => $texte,
    ],
];

$opts = [
    'http' => [
        'method'  => 'POST',
        'header'  => implode("\r\n", [
            'Content-Type: application/json',
            'Authorization: key=' . FCM_SERVER_KEY,
        ]),
        'content' => json_encode($message),
    ],
];

$context = stream_context_create($opts);
$result = @file_get_contents('https://fcm.googleapis.com/fcm/send', false, $context);

echo $result !== false ? $result : json_encode(['error' => 'Erreur envoi FCM']);
