<?php
header('Content-Type: application/json; charset=utf-8');

if (!isset($_GET['url']) || empty($_GET['url'])) {
	echo json_encode(['error' => 'URL manquante']);
	exit;
}

$url = trim($_GET['url']);

// Accepter uniquement les URLs http et https
if (!filter_var($url, FILTER_VALIDATE_URL) || !preg_match('/^https?:\/\//i', $url)) {
	echo json_encode(['error' => 'URL invalide']);
	exit;
}

// Bloquer les IPs privées et locales (SSRF protection)
$host = parse_url($url, PHP_URL_HOST);
if ($host) {
	$ip = gethostbyname($host);
	if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
		echo json_encode(['error' => 'URL non autorisée']);
		exit;
	}
}

$context = stream_context_create([
	'http' => [
		'method' => 'GET',
		'header' => implode("\r\n", [
			'User-Agent: Mozilla/5.0 (compatible; ShashaBot/1.0)',
			'Accept: text/html,application/xhtml+xml',
			'Accept-Language: fr,en;q=0.9',
		]),
		'timeout' => 5,
		'follow_location' => true,
		'max_redirects' => 3,
	],
	'ssl' => [
		'verify_peer' => true,
		'verify_peer_name' => true,
	]
]);

// Lire seulement les 100 premiers Ko pour trouver les balises OG dans le <head>
$html = @file_get_contents($url, false, $context, 0, 102400);

if ($html === false) {
	echo json_encode(['error' => 'Impossible de récupérer la page']);
	exit;
}

$og = [];

// Extraire les balises <meta property="og:...">
preg_match_all('/<meta[^>]+property=["\']og:([^"\']+)["\'][^>]+content=["\']([^"\']*)["\'][^>]*\/?>/i', $html, $m1);
for ($i = 0; $i < count($m1[1]); $i++) {
	$og[$m1[1][$i]] = html_entity_decode($m1[2][$i], ENT_QUOTES, 'UTF-8');
}

// Ordre inversé des attributs (content avant property)
preg_match_all('/<meta[^>]+content=["\']([^"\']*)["\'][^>]+property=["\']og:([^"\']+)["\'][^>]*\/?>/i', $html, $m2);
for ($i = 0; $i < count($m2[2]); $i++) {
	if (!isset($og[$m2[2][$i]])) {
		$og[$m2[2][$i]] = html_entity_decode($m2[1][$i], ENT_QUOTES, 'UTF-8');
	}
}

// Fallback : balise <title>
if (empty($og['title'])) {
	if (preg_match('/<title[^>]*>([^<]+)<\/title>/i', $html, $titleMatch)) {
		$og['title'] = html_entity_decode(trim($titleMatch[1]), ENT_QUOTES, 'UTF-8');
	}
}

$result = [];
if (!empty($og['title']))       $result['title']       = mb_substr($og['title'], 0, 200);
if (!empty($og['description'])) $result['description'] = mb_substr($og['description'], 0, 300);
if (!empty($og['image']))       $result['image']       = $og['image'];
if (!empty($og['site_name']))   $result['site_name']   = mb_substr($og['site_name'], 0, 100);

echo json_encode($result);
