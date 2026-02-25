<?php
//Enable error reporting.
error_reporting(E_ALL);
ini_set("display_errors", 1);

$upload_tmp_dir = ini_get('upload_tmp_dir');
if (empty($upload_tmp_dir)) $upload_tmp_dir = ".";
$upload_tmp_dir .= "/";

// Traitement du partage de texte/URL via le Web Share Target
$shared_text = '';
if (!empty($_POST['text'])) {
	$shared_text = trim($_POST['text']);
}
if (!empty($_POST['url'])) {
	$url = trim($_POST['url']);
	$shared_text = $shared_text ? $shared_text . ' ' . $url : $url;
}
if (empty($shared_text) && !empty($_POST['title'])) {
	$shared_text = trim($_POST['title']);
}
// Vrai fichier = uploadé sans erreur ET avec du contenu (> 0 octet)
// Cela gère le cas où Android envoie un champ fichier vide (size=0) avec le texte partagé
$has_real_file = isset($_FILES["fichier"])
	&& $_FILES["fichier"]["error"] === 0
	&& $_FILES["fichier"]["size"] > 0;

// Certains appareils Android envoient le texte partagé comme un petit fichier text/plain
// au lieu de remplir les champs POST text/url/title
if ($has_real_file && empty($shared_text) && $_FILES["fichier"]["size"] <= 2000) {
	$mime = @mime_content_type($_FILES["fichier"]["tmp_name"]);
	if ($mime === 'text/plain') {
		$file_text = trim(file_get_contents($_FILES["fichier"]["tmp_name"]));
		if (!empty($file_text)) {
			$shared_text = $file_text;
			$has_real_file = false;
		}
	}
}

if (!empty($shared_text) && !$has_real_file) {
	$shared_text = mb_substr($shared_text, 0, 300);
	header("Location: /?shared_text=" . urlencode($shared_text));
	exit;
}

$error_msgs = array(
	0 => "There is no error, the file uploaded with success",
	1 => "The uploaded file exceeds the upload_max_filesize directive in php.ini",
	2 => "The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form",
	3 => "The uploaded file was only partially uploaded",
	4 => "No file was uploaded",
	6 => "Missing a temporary folder",
	7 => "Failed to write file to disk.",
	8 => "A PHP extension stopped the file upload.",
);

if ($_FILES["fichier"]["error"] !== 0) {
	echo "<pre>" . $upload_tmp_dir . "</pre>";
	echo "<pre>" . var_dump($_FILES) . "</pre>";
	die($error_msgs[$_FILES["fichier"]["error"]]);
}

$uploadOk       = 1;
$config_file    = $upload_tmp_dir . "shasha_config.json";
$default_extensions = ["jpg", "pdf", "png", "gif", "jpeg", "zip", "docx", "csv", "svg", "wav", "stl", "txt"];
if (file_exists($config_file)) {
	$config = json_decode(file_get_contents($config_file), true);
	$extensions = $config['extensions'] ?? $default_extensions;
} else {
	$extensions = $default_extensions;
}
$target_dir     = $upload_tmp_dir . "/";
$file_to_upload = $target_dir . basename($_FILES["fichier"]["name"]);
$imageFileType  = strtolower(pathinfo($file_to_upload, PATHINFO_EXTENSION));
$target_file    = $target_dir . "post-" . md5($file_to_upload) . "." . $imageFileType;

// Check if file already exists
if (file_exists($target_file)) {
	die("Sorry, file already exists.");
	$uploadOk = 0;
}

// Check file size
if ($_FILES["fichier"]["size"] > 10 * 1000 * 1000) {
	die("Sorry, your file is too large.");
	$uploadOk = 0;
}

// Allow certain file formats
if (!in_array($imageFileType, $extensions)) {
	die("Fichiers autorises : " . strtoupper(implode(", ", $extensions)) . ". " . $imageFileType);
	$uploadOk = 0;
}

// Check if $uploadOk is set to 0 by an error
if ($uploadOk == 0) {
	die("Sorry, your file was not uploaded.");
	// if everything is ok, try to upload file
} else {
	if (move_uploaded_file($_FILES["fichier"]["tmp_name"], $target_file)) {
		header("Location: .");
		exit;
	} else {
		die("Sorry, there was an error uploading your file " .  $target_file);
	}
}

