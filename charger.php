<?php
//Enable error reporting.
error_reporting(E_ALL);
ini_set("display_errors", 1);

$upload_tmp_dir = ini_get('upload_tmp_dir');
if (empty($upload_tmp_dir)) $upload_tmp_dir = ".";
$upload_tmp_dir .= "/";

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
$extensions     = ["jpg", "pdf", "png", "gif", "jpeg", "zip", "docx", "csv", "svg", "wav", "stl"];
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
