<?php
require_once __DIR__ . '/config.php';
header('Content-Type: application/json');

try {
    $query = "SELECT * FROM products WHERE deleted = 0";
    $params = [];
    if (isset($_GET['category'])) {
        $query .= " AND category = ?";
        $params[] = $_GET['category'];
    }
    if (isset($_GET['featured']) && $_GET['featured'] === 'true') {
        $query .= " AND featured = 1";
    }
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($products as &$product) {
        $product['sizes'] = json_decode($product['sizes'], true) ?: [];
        $product['image'] = $product['image'] ? $product['image'] : '';
    }
    jsonResponse(true, ['products' => $products]);
} catch (Exception $e) {
    jsonResponse(false, [], 'Error: ' . $e->getMessage());
}
?>