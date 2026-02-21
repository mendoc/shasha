<?php
$path = ini_get('upload_tmp_dir');
if (empty($path)) $path = ".";
$path .= "/";

$regex = $path . "*post-*";
$expiration = 24 * 60 * 60;

// Chargement des fichiers épinglés
$pins_file = $path . "shasha_pins.json";
$pins = [];
if (file_exists($pins_file)) {
	$pins = json_decode(file_get_contents($pins_file), true) ?? [];
}

purge($regex, $expiration, $pins);

$files = glob($regex);

if (isset($_GET["f"]) and !empty($_GET["f"])) {
	$fn = $_GET["f"];
	$path . $fn;
	download_file($path . $fn);
	exit;
} else if (isset($_GET["p"]) and !empty($_GET["p"])) {
	$fn = $_GET["p"];
	preview_file($path . $fn);
	exit;
} else if (isset($_GET["d"]) and !empty($_GET["d"])) {
	$fn_only = $_GET["d"];
	$fn = $path . $fn_only;
	unlink($fn);
	// Retirer le fichier de la liste des épinglés s'il y figure
	if (in_array($fn_only, $pins)) {
		$pins = array_values(array_filter($pins, function ($p) use ($fn_only) { return $p !== $fn_only; }));
		file_put_contents($pins_file, json_encode($pins));
	}
	header("Location: /");
	exit;
}

function restant($secs)
{
	if ($secs > 3600) return (int)($secs / 3600) . " h";
	if ($secs > 60) return (int)($secs / 60) . " min";
	if ($secs < 0) return "0 s";
	return $secs . " s";
}
function purge($reg, $exp, $pins = [])
{
	$fs = glob($reg);
	foreach ($fs as $f) {
		if (in_array(basename($f), $pins)) continue; // Ne pas supprimer les fichiers épinglés
		if ((time() - filectime($f)) > $exp) {
			unlink($f);
		}
	}
}
function download_file($file)
{
	if (file_exists($file)) {
		header('Content-Description: File Transfer');
		header('Content-Type: application/octet-stream');
		header('Content-Disposition: attachment; filename="' . basename($file) . '"');
		header('Expires: 0');
		header('Cache-Control: must-revalidate');
		header('Pragma: public');
		header('Content-Length: ' . filesize($file));
		readfile($file);
		exit;
	}
}
function preview_file($file)
{
	if (file_exists($file)) {
		$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
		$mime_types = [
			'jpg'  => 'image/jpeg',
			'jpeg' => 'image/jpeg',
			'png'  => 'image/png',
			'gif'  => 'image/gif',
			'svg'  => 'image/svg+xml',
			'pdf'  => 'application/pdf',
		];
		if (isset($mime_types[$ext])) {
			header('Content-Type: ' . $mime_types[$ext]);
			header('Cache-Control: public, max-age=3600');
			readfile($file);
		}
	}
}
function is_image($filename)
{
	$ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
	return in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'svg']);
}
function reduire($str)
{
	return substr($str, 0, strlen($str) / 4) . "..." . substr($str, -strlen($str) / 4);
}
function taille_format($taille)
{
	if ($taille < 0) return "Plus de 2 Go";
	if ($taille >= 1000000000) return number_format(($taille / 1000000000), 2, ".", "") . " Go";
	if ($taille >= 100000000) return (int)($taille / 1000000) . " Mo";
	if ($taille >= 10000000) return number_format(($taille / 1000000), 1, ".", "") . " Mo";
	if ($taille >= 1000000) return number_format(($taille / 1000000), 2, ".", "") . " Mo";
	if ($taille >= 100000) return (int)($taille / 1000) . " Ko";
	if ($taille >= 10000) return number_format(($taille / 1000), 1, ".", "") . " Ko";
	if ($taille >= 1000) return number_format(($taille / 1000), 2, ".", "") . " Ko";
	return $taille . " octet" . (($taille > 1) ? "s" : "");
}
?>

<!DOCTYPE html>
<html lang="fr">

<head>
	<title>Shasha | Plateforme de partage</title>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.1/dist/css/bootstrap.min.css" integrity="sha384-zCbKRCUGaJDkqS1kPbPd7TveP5iyJE0EjAuZQTgFLD2ylzuqKfdKlfG/eSrtxUkn" crossorigin="anonymous">

	<link href="assets/css/animate.min.css" rel="stylesheet">

	<link rel="icon" href="assets/img/logo.png" />

	<link rel="manifest" href="/manifest.json" />

	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta charset="utf-8" />
	<meta name="description" content="Partagez vos fichiers et contenus en toute simplicité." />

	<!-- Open Graph -->
	<meta property="og:title" content="Shasha | Plateforme de partage" />
	<meta property="og:description" content="Partagez vos fichiers et contenus en toute simplicité." />
	<meta property="og:image" content="https://shasha.alwaysdata.net/assets/img/logo.png" />
	<meta property="og:url" content="https://shasha.alwaysdata.net" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Shasha" />
	<meta property="og:locale" content="fr_FR" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Shasha | Plateforme de partage" />
	<meta name="twitter:description" content="Partagez vos fichiers et contenus en toute simplicité." />
	<meta name="twitter:image" content="https://shasha.alwaysdata.net/assets/img/logo.png" />

	<style>
		body {
			font-family: Arial, sans-serif;
			margin: 0 auto;
		}

		.delete {
			border-color: red;
			cursor: pointer;
		}

		#box-details {
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-color: rgba(0, 0, 0, .5);
		}

		#box-details .content {
			background-color: #ffffff;
			max-width: 700px;
			line-break: anywhere;
		}

		#box-update {
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-color: rgba(0, 0, 0, .5);
			z-index: 9999;
		}

		#box-update .content {
			background-color: #ffffff;
			max-width: 400px;
			width: 90%;
		}

		#version {
			opacity: 0;
			transition: opacity .5s;
		}

		.nb-posts {
			display: none;
			margin-top: 1.5rem;
		}

		.nb-posts span {
			background: #004aad;
			font-size: .7rem;
			display: block;
			width: fit-content;
			margin: auto;
			margin-top: -13px;
		}

		.day-group {
			margin-bottom: 8px;
		}

		.day-separator {
			display: flex;
			align-items: center;
			margin: 20px 0 10px;
			color: #6c757d;
			font-size: .75rem;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: .6px;
		}

		.day-separator::before,
		.day-separator::after {
			content: '';
			flex: 1;
			height: 1px;
			background: #dee2e6;
		}

		.day-separator span {
			padding: 0 12px;
		}

		.og-preview {
			border-radius: calc(.25rem - 1px) calc(.25rem - 1px) 0 0;
			overflow: hidden;
			border-bottom: 1px solid rgba(0, 0, 0, .125);
			cursor: pointer;
		}

		.og-image {
			width: 100%;
			max-height: 160px;
			object-fit: cover;
			display: block;
		}

		.og-text {
			padding: 8px 12px;
		}

		.og-site {
			display: block;
			font-size: .65rem;
			text-transform: uppercase;
			color: #6c757d;
			letter-spacing: .5px;
			margin-bottom: 2px;
		}

		.og-title {
			display: block;
			font-size: .82rem;
			font-weight: 600;
			line-height: 1.3;
			color: #212529;
			margin-bottom: 3px;
		}

		.og-description {
			font-size: .73rem;
			color: #6c757d;
			line-height: 1.4;
			margin-bottom: 0;
			display: -webkit-box;
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}

		.btn-copy-link {
			float: right;
			background: none;
			border: none;
			padding: 2px 4px;
			cursor: pointer;
			color: #adb5bd;
			opacity: 0;
			transition: opacity .2s, color .15s;
			line-height: 1;
			border-radius: 4px;
		}

		.post:hover .btn-copy-link,
		#box-details .btn-copy-link {
			opacity: 1;
		}

		.btn-copy-link:hover {
			color: #495057;
		}

		@media (max-width: 767px) {
			.btn-copy-link {
				opacity: 1;
			}
		}

		.file {
			position: relative;
		}

		.btn-pin-file {
			position: absolute;
			top: 4px;
			right: 4px;
			background: none;
			border: none;
			padding: 6px 8px;
			cursor: pointer;
			color: #adb5bd;
			opacity: 0;
			transition: opacity .2s, color .15s;
			line-height: 1;
			border-radius: 4px;
			z-index: 1;
		}

		.file:hover .btn-pin-file,
		.btn-pin-file.pinned {
			opacity: 1;
		}

		.btn-pin-file.pinned {
			color: #004aad;
		}

		.btn-pin-file:hover {
			color: #495057;
		}

		@media (max-width: 767px) {
			.btn-pin-file {
				opacity: 1;
			}
		}

		/* Skeleton loaders */
		.skeleton {
			background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
			background-size: 200% 100%;
			animation: skeleton-shimmer 1.5s infinite;
			border-radius: 4px;
			display: block;
		}

		@keyframes skeleton-shimmer {
			0% { background-position: 200% 0; }
			100% { background-position: -200% 0; }
		}

		.skeleton-line {
			height: 14px;
			margin-bottom: 8px;
		}

		.skeleton-time {
			height: 10px;
			width: 35px;
		}

		/* Bouton retour en haut */
		#btn-back-to-top {
			position: fixed;
			bottom: 24px;
			right: 24px;
			background: #004aad;
			color: #fff;
			border: none;
			border-radius: 50%;
			width: 44px;
			height: 44px;
			display: none;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			box-shadow: 0 2px 8px rgba(0, 0, 0, .25);
			z-index: 1000;
			opacity: .85;
			transition: opacity .2s;
		}

		#btn-back-to-top:hover {
			opacity: 1;
		}

		@media (max-width: 767px) {
			#btn-back-to-top {
				right: 50%;
				transform: translateX(50%);
			}
		}

		.file-preview-img {
			width: 100%;
			max-height: 160px;
			object-fit: cover;
			display: block;
			border-radius: calc(.25rem - 1px) calc(.25rem - 1px) 0 0;
			border-bottom: 1px solid rgba(0, 0, 0, .125);
		}

		.file-preview-pdf-wrapper {
			height: 160px;
			display: flex;
			align-items: center;
			justify-content: center;
			background: #f8f8f8;
			border-radius: calc(.25rem - 1px) calc(.25rem - 1px) 0 0;
			border-bottom: 1px solid rgba(0, 0, 0, .125);
			color: #c0392b;
		}
	</style>
</head>

<body>
	<div class="m-auto text-center" style="font-size: .7rem;"><span id="version" class="bg-success p-1 text-white rounded-bottom">...</span></div>
	<div class="container mb-5">
		<form id="form-ecrire-post" class="mb-3 mt-2">
			<fieldset>
				<div class="form-group">
					<div class="d-flex justify-content-between align-items-center mb-2">
						<label class="mb-0 font-weight-bold mt-2" for="post-content">Contenu à poster | <span id="nb-chars">0</span> sur 300</label>
						<div>
						<button id="btn-actualiser" class="btn btn-outline-secondary btn-sm mr-1" title="Actualiser la page">
							<svg xmlns="http://www.w3.org/2000/svg" style="height: 16px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
						</button>
						<button id="btn-charger-fichier" class="btn btn-primary btn-sm">Charger un fichier</button>
					</div>
					</div>
					<textarea name="content" autofocus="true" maxlength="300" class="form-control" placeholder="Saisissez votre post" id="post-content" rows="3"></textarea>
				</div>
			</fieldset>
		</form>
		<?php if (count($files) > 0) : ?>
			<small class="d-flex align-items-center">
				<svg xmlns="http://www.w3.org/2000/svg" style="height: 20px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
				<span class="ml-1">Les fichiers de plus de 24h seront supprimés (sauf les fichiers épinglés)</span>
			</small>
			<hr>
			<div class="card-columns false" id="all-files">
				<?php foreach ($files as $f) : ?>
					<?php $fn = str_replace($path, "", $f) ?>
					<div class="card file" style="cursor: pointer" data-url="<?= $fn ?>">
					<?php if (is_image($fn)) : ?>
					<img src="?p=<?= urlencode($fn) ?>" class="file-preview-img" alt="Aperçu de <?= htmlspecialchars(basename($fn)) ?>">
					<?php elseif (strtolower(pathinfo($fn, PATHINFO_EXTENSION)) === 'pdf') : ?>
					<div class="file-preview-pdf-wrapper">
						<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
						</svg>
					</div>
					<?php endif; ?>
						<div class="card-body text-center animate__animated animate__fadeIn">
							<button class="btn-pin-file <?= in_array($fn, $pins) ? 'pinned' : '' ?>" data-file="<?= htmlspecialchars($fn) ?>" title="<?= in_array($fn, $pins) ? 'Désépingler' : 'Épingler' ?>">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="<?= in_array($fn, $pins) ? 'currentColor' : 'none' ?>" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
							</button>
							<?php if (!is_image($fn) && strtolower(pathinfo($fn, PATHINFO_EXTENSION)) !== 'pdf') : ?>
							<svg xmlns="http://www.w3.org/2000/svg" style="height: 60px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
							<?php endif; ?>
							<p class="card-text mb-0"><?= reduire($fn) . " (" . taille_format(filesize($f)) . ")"; ?> </p>
							<?php if (in_array($fn, $pins)) : ?>
								<small class="text-success">Fichier épinglé</small>
							<?php else : ?>
								<small>Suppression dans <?= restant($expiration - (time() - filectime($f))) ?></small>
							<?php endif; ?>
						</div>
					</div>
				<?php endforeach; ?>
			</div>
		<?php endif; ?>
		<div class="border-top text-center nb-posts animate__animated animate__fadeIn">
			<span class="border text-white p-1 rounded"></span>
		</div>
		<div class="mt-3" id="all-posts">
			<div id="recent-posts"></div>
			<div id="older-posts"></div>
			<div id="load-more-sentinel" class="text-center py-2" style="display:none">
				<div id="load-more-loader" class="d-flex justify-content-center align-items-center" style="display:none">
					<div class="spinner-border spinner-border-sm text-secondary" role="status"></div>
					<span class="text-muted ml-2">Chargement des posts anciens...</span>
				</div>
			</div>
		</div>
		<div id="loader">
			<div class="day-group mt-3">
				<div class="day-separator">
					<span class="skeleton skeleton-line" style="width: 80px;"></span>
				</div>
				<div class="card-columns">
					<div class="card">
						<div class="card-body">
							<div class="skeleton skeleton-line" style="width: 100%;"></div>
							<div class="skeleton skeleton-line" style="width: 75%;"></div>
							<div class="skeleton skeleton-line" style="width: 55%;"></div>
							<blockquote class="blockquote mb-0">
								<footer class="blockquote-footer">
									<span class="skeleton skeleton-time"></span>
								</footer>
							</blockquote>
						</div>
					</div>
					<div class="card">
						<div class="card-body">
							<div class="skeleton skeleton-line" style="width: 90%;"></div>
							<div class="skeleton skeleton-line" style="width: 50%;"></div>
							<blockquote class="blockquote mb-0">
								<footer class="blockquote-footer">
									<span class="skeleton skeleton-time"></span>
								</footer>
							</blockquote>
						</div>
					</div>
					<div class="card">
						<div class="card-body">
							<div class="skeleton skeleton-line" style="width: 85%;"></div>
							<div class="skeleton skeleton-line" style="width: 100%;"></div>
							<div class="skeleton skeleton-line" style="width: 40%;"></div>
							<blockquote class="blockquote mb-0">
								<footer class="blockquote-footer">
									<span class="skeleton skeleton-time"></span>
								</footer>
							</blockquote>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div id="box-details" style="display:none">
		<div class="back d-flex justify-content-center align-items-center h-100">
			<div class="content shadow-lg p-3 mb-5 bg-white rounded w-75 animate__animated animate__zoomIn animate__faster">
				Le contenu du post en grand
			</div>
		</div>
	</div>
	<div id="box-update" style="display:none">
		<div class="d-flex justify-content-center align-items-center h-100">
			<div class="content shadow-lg p-4 bg-white rounded text-center animate__animated animate__zoomIn animate__faster">
				<p class="mb-1" style="font-size:2rem;">&#x1F4E6;</p>
				<h5 class="font-weight-bold mb-2">Mise à jour disponible</h5>
				<p class="text-muted mb-3" style="font-size:.9rem;">Une nouvelle version de l'application est disponible. Mettez à jour pour profiter des dernières améliorations.</p>
				<button id="btn-update" class="btn btn-primary btn-block">Mettre à jour</button>
			</div>
		</div>
	</div>
	<button id="btn-back-to-top" title="Retour en haut de la page">
		<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
			<path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
		</svg>
	</button>
	<div style="display:none">
		<form id="form-charger-fichier" action="charger.php" method="post" enctype="multipart/form-data">
			<input id="charger-fichier" type="file" name="fichier">
		</form>
	</div>
	<!--Import jQuery before materialize.js-->
	<script src="https://code.jquery.com/jquery-3.6.0.slim.min.js" integrity="sha256-u7e5khyithlIdTpu22PHhENmPcRdFiHRjhAuHcs05RI=" crossorigin="anonymous"></script>
	<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-ka7Sk0Gln4gmtz2MlQnikT1wXgYsOg+OMhuP+IlRH9sENBO0LRn5q+8nbTov4+1p" crossorigin="anonymous"></script>
	<script type="text/javascript" src="assets/js/linkify.min.js"></script>
	<script type="text/javascript" src="assets/js/linkify-jquery.min.js"></script>

	<!-- Firebase -->
	<script src="https://www.gstatic.com/firebasejs/3.7.3/firebase.js"></script>
	<script src="assets/js/main.js"></script>
	<script src="assets/js/app.js"></script>
</body>

</html>