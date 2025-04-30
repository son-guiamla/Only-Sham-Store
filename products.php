<?php
require_once 'config.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';
$productId = $_GET['id'] ?? null;

if ($action === 'get' && $productId) {
    handleGetProduct();
} else {
    echo json_encode(["success" => false, "error" => "Invalid action or missing ID"]);
}

function handleGetProduct() {
    global $conn, $productId;
    
    try {
        // Get product details
        $stmt = $conn->prepare("SELECT * FROM products WHERE product_id = :product_id");
        $stmt->execute([':product_id' => $productId]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            echo json_encode(["success" => false, "error" => "Product not found"]);
            return;
        }
        
        // Get available sizes and stock
        $stmt = $conn->prepare("SELECT size_name as name, stock FROM product_sizes 
                              WHERE product_id = :product_id AND stock > 0");
        $stmt->execute([':product_id' => $productId]);
        $sizes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format response
        $response = [
            "success" => true,
            "product" => [
                "product_id" => $product['product_id'],
                "name" => $product['name'],
                "description" => $product['description'],
                "price" => (float)$product['price'],
                "original_price" => $product['original_price'] ? (float)$product['original_price'] : null,
                "discount_text" => $product['discount_text'],
                "image" => $product['image_url'],
                "sizes" => $sizes
            ]
        ];
        
        echo json_encode($response);
    } catch (PDOException $e) {
        error_log("Database error in getProduct: " . $e->getMessage());
        echo json_encode(["success" => false, "error" => "Database error"]);
    }
}
?>