<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST');
    header('Access-Control-Allow-Headers: Content-Type');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('POST only', 405);
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body) errorResponse('Invalid JSON');

$required = ['hand','yaku','han','fu','totalScore','fuHanText','agari','oyako','isYakuman'];
foreach ($required as $key) {
    if (!isset($body[$key])) errorResponse("Missing field: {$key}");
}

$hand       = $body['hand'];
$yaku       = $body['yaku'];
$han        = (int)$body['han'];
$fu         = (int)$body['fu'];
$totalScore = (int)$body['totalScore'];
$fuHanText  = trim($body['fuHanText']);
$agari      = $body['agari'] === 'tsumo' ? 'tsumo' : 'ron';
$oyako      = $body['oyako'] === 'oya'   ? 'oya'   : 'ko';
$isYakuman  = (bool)$body['isYakuman'] ? 1 : 0;

if (!is_array($hand) || !is_array($yaku)) errorResponse('hand/yaku must be array');

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('
        INSERT INTO agari_records
            (hand, yaku, han, fu, total_score, fu_han_text, agari_type, oyako, is_yakuman)
        VALUES
            (:hand, :yaku, :han, :fu, :total_score, :fu_han_text, :agari_type, :oyako, :is_yakuman)
    ');
    $stmt->execute([
        ':hand'        => json_encode($hand,  JSON_UNESCAPED_UNICODE),
        ':yaku'        => json_encode($yaku,  JSON_UNESCAPED_UNICODE),
        ':han'         => $han,
        ':fu'          => $fu,
        ':total_score' => $totalScore,
        ':fu_han_text' => $fuHanText,
        ':agari_type'  => $agari,
        ':oyako'       => $oyako,
        ':is_yakuman'  => $isYakuman,
    ]);

    $yakuStmt = $pdo->prepare('
        INSERT INTO yaku_stats (yaku_name, count)
        VALUES (:name, 1)
        ON DUPLICATE KEY UPDATE count = count + 1
    ');
    foreach ($yaku as $y) {
        $yakuStmt->execute([':name' => $y['name']]);
    }

    $pdo->exec('UPDATE agari_count SET total = total + 1 WHERE id = 1');
    $pdo->commit();

    jsonResponse(['success' => true]);

} catch (Exception $e) {
    $pdo->rollBack();
    errorResponse('DB error: ' . $e->getMessage(), 500);
}
