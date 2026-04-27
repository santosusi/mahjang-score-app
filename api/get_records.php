<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('GET only', 405);
}

try {
    $pdo = getDB();

    $bestStmt = $pdo->query('
        SELECT * FROM agari_records
        ORDER BY total_score DESC, created_at DESC
        LIMIT 1
    ');
    $best = $bestStmt->fetch();
    if ($best) {
        $best['hand']       = json_decode($best['hand'], true);
        $best['yaku']       = json_decode($best['yaku'], true);
        $best['is_yakuman'] = (bool)$best['is_yakuman'];
    }

    $statsStmt = $pdo->query('
        SELECT yaku_name, count FROM yaku_stats
        ORDER BY count DESC
    ');
    $yakuStats = [];
    while ($row = $statsStmt->fetch()) {
        $yakuStats[$row['yaku_name']] = (int)$row['count'];
    }

    $countStmt  = $pdo->query('SELECT total FROM agari_count WHERE id = 1');
    $agariCount = (int)($countStmt->fetchColumn() ?: 0);

    jsonResponse([
        'success'    => true,
        'best'       => $best ?: null,
        'yakuStats'  => $yakuStats,
        'agariCount' => $agariCount,
    ]);

} catch (Exception $e) {
    errorResponse('DB error: ' . $e->getMessage(), 500);
}
