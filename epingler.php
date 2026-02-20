<?php
header('Content-Type: application/json');

$path = ini_get('upload_tmp_dir');
if (empty($path)) $path = ".";
$path .= "/";

$pins_file = $path . "shasha_pins.json";
$pins = [];
if (file_exists($pins_file)) {
	$pins = json_decode(file_get_contents($pins_file), true) ?? [];
}

if (isset($_GET["f"]) && !empty($_GET["f"])) {
	$fn = $_GET["f"];

	// Validation : seuls les fichiers du format post-[md5].[ext] sont acceptés
	if (!preg_match('/^post-[a-f0-9]{32}\.[a-z0-9]{1,5}$/', $fn)) {
		echo json_encode(["error" => "Nom de fichier invalide"]);
		exit;
	}

	// Vérification que le fichier existe
	if (!file_exists($path . $fn)) {
		echo json_encode(["error" => "Fichier introuvable"]);
		exit;
	}

	if (in_array($fn, $pins)) {
		$pins = array_values(array_filter($pins, function ($p) use ($fn) { return $p !== $fn; }));
		$pinned = false;
	} else {
		$pins[] = $fn;
		$pinned = true;
	}

	file_put_contents($pins_file, json_encode($pins));
	echo json_encode(["pinned" => $pinned]);
} else {
	echo json_encode(["error" => "Aucun fichier spécifié"]);
}
