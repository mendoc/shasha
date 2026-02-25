<?php
$upload_tmp_dir = ini_get('upload_tmp_dir');
if (empty($upload_tmp_dir)) $upload_tmp_dir = ".";
$upload_tmp_dir .= "/";

$config_file = $upload_tmp_dir . "shasha_config.json";
$default_extensions = ["jpg", "pdf", "png", "gif", "jpeg", "zip", "docx", "csv", "svg", "wav", "stl", "txt"];

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
	if (file_exists($config_file)) {
		$config = json_decode(file_get_contents($config_file), true);
		echo json_encode(['extensions' => $config['extensions'] ?? $default_extensions]);
	} else {
		echo json_encode(['extensions' => $default_extensions]);
	}
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
	$input = json_decode(file_get_contents('php://input'), true);
	if (isset($input['extensions']) && is_array($input['extensions'])) {
		$extensions = array_values(array_unique(array_filter(array_map(function ($ext) {
			return strtolower(preg_replace('/[^a-z0-9]/', '', strtolower($ext)));
		}, $input['extensions']))));
		$config = ['extensions' => $extensions];
		file_put_contents($config_file, json_encode($config));
		echo json_encode(['success' => true, 'extensions' => $extensions]);
	} else {
		http_response_code(400);
		echo json_encode(['error' => 'Invalid input']);
	}
}
