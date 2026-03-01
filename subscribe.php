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
            'Content-Length: 0',
        ]),
        'content' => '',
    ],
];

$context = stream_context_create($opts);
$response = file_get_contents($url, false, $context);

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
