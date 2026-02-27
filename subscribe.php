<?php
header('Content-Type: application/json');
require_once __DIR__ . '/fcm_config.php';

$input = json_decode(file_get_contents('php://input'), true);
$token = $input['token'] ?? '';

if (!$token) {
    http_response_code(400);
    echo json_encode(['error' => 'Token manquant']);
    exit;
}

// Abonnement au topic 'new-posts' via l'API FCM IID
$url = 'https://iid.googleapis.com/iid/v1/' . $token . '/rel/topics/new-posts';

$opts = [
    'http' => [
        'method'  => 'POST',
        'header'  => implode("\r\n", [
            'Content-Type: application/json',
            'Authorization: key=' . FCM_SERVER_KEY,
        ]),
        'content' => '',
    ],
];

$context = stream_context_create($opts);
@file_get_contents($url, false, $context);

echo json_encode(['success' => true]);
