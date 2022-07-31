<?php
$path = ini_get('upload_tmp_dir') . "/";
$regex = $path . "*post-*";
$expiration = 24 * 60 * 60;

purge($regex, $expiration);

$files = glob($regex);

if (isset($_GET["f"]) and !empty($_GET["f"])) {
	$fn = $_GET["f"];
	$path . $fn;
	download_file($path . $fn);
	exit;
}

function restant($secs) 
{
	if ($secs > 3600) return (int)($secs / 3600) . " h";
	if ($secs > 60) return (int)($secs / 60) . " min";
	if ($secs < 0) return "0 s";
	return $secs . " s";
}
function purge($reg, $exp)
{
	$fs = glob($reg);
	foreach($fs as $f) {
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
function reduire($str)
{
	return substr($str, 0, strlen($str)/4) . "..." . substr($str, -strlen($str)/4);
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

	    <link rel="preconnect" href="https://fonts.googleapis.com">
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
		<link href="https://fonts.googleapis.com/css2?family=Work+Sans&display=swap" rel="stylesheet">
		
		<link href="assets/css/animate.min.css" rel="stylesheet">

		<link rel="icon" href="assets/img/logo.png" />

		<link rel="manifest" href="/manifest.json" />

	    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
	    <meta charset="utf-8" />
	    
	    <style>
	    	body {
	    		font-family: 'Work Sans', sans-serif;
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
	    	#box-details .content{
	    		background-color: #ffffff;
	    		max-width: 700px;
    			line-break: anywhere;
	    	}
			#version {
				opacity: 0;
				transition: opacity .5s;
			}
	    </style>
	</head>

	<body>
		<div class="m-auto text-center" style="font-size: .7rem;"><span id="version" class="bg-success p-1 text-white rounded-bottom">1.00.00</span></div>
		<div class="container mb-5">
			<form id="form-ecrire-post" class="mb-3 mt-2">
				<fieldset>
					<div class="form-group">
						<div class="d-flex justify-content-between align-items-center mb-2">
							<label class="mb-0 font-weight-bold mt-2" for="post-content">Contenu à poster | <span id="nb-chars">0</span> sur 300</label>
							<button id="btn-charger-fichier" class="btn btn-primary btn-sm">Charger un fichier</button>
						</div>
						<textarea name="content" autofocus="true" maxlength="300" class="form-control" placeholder="Saisissez votre post" id="post-content" rows="3"></textarea>
					</div>
				</fieldset>
			</form>
			<?php if(count($files) > 0): ?>
				<small class="d-flex align-items-center">
					<svg xmlns="http://www.w3.org/2000/svg" style="height: 20px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
					<span class="ml-1">Les fichiers de plus de 24h seront supprimés</span>
				</small>
				<hr>
				<div class="card-columns false" id="all-files">
					<?php foreach($files as $f): ?>
					<?php $fn = str_replace($path,"", $f) ?>
					<a href="?f=<?= $fn ?>" target="_blank" class="text-decoration-none text-dark">
						<div class="card" style="cursor: pointer">
							<div class="card-body text-center animate__animated animate__fadeIn">
								<svg xmlns="http://www.w3.org/2000/svg" style="height: 60px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
								<p class="card-text mb-0"><?= reduire($fn) . " (" . taille_format(filesize($f)) . ")"; ?> </p>
								<small>Suppression dans <?= restant($expiration - (time() - filectime($f))) ?></small>
							</div>
						</div>
					</a>
					<?php endforeach; ?>
				</div>
			<?php endif; ?>
			<hr>
			<div class="card-columns false" id="all-posts"></div>
			<div id="loader">
				<div class="d-flex justify-content-center flex-column align-items-center mt-5">
				  <div class="spinner-border" role="status">
				    <span class="sr-only">Loading...</span>
				  </div>
				  <span class="font-italic mt-2">Chargement des posts ...</span>
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