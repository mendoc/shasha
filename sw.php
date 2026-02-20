<?php
header('Content-Type: application/javascript');
header('Cache-Control: no-store');

$version = json_decode(file_get_contents(__DIR__ . '/version.json'), true)['version'];
$template = file_get_contents(__DIR__ . '/sw.template.js');
echo str_replace('__VERSION__', $version, $template);
