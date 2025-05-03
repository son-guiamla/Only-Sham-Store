<?php
require_once 'config.php';

header('Content-Type: application/json');

// Check if user is admin
if (isset($_SESSION['is_admin']) && $_SESSION['is_admin']) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $_POST['action'] ?? '';
        
        if ($action === 'add_product') {
            // Handle product addition
            $name = trim($_POST['name']);
            $description = trim($_POST['description'] ?? '');
            $price = floatval($_POST['price']);
            $category = trim($_POST['category']);
            $is_on_sale = isset($_POST['is_on_sale']) ? 1 : 0;
            $sale_price = $is_on_sale ? floatval($_POST['sale_price']) : null;
            $stock_quantity = intval($_POST['stock_quantity']);
            
            // Handle file upload
            $image_path = '';
            if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                $upload_dir = 'uploads/products/';
                if (!is_dir($upload_dir)) {
                    mkdir($upload_dir, 0755, true);
                }
                
                $file_ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
                $file_name = uniqid('product_') . '.' . $file_ext;
                $target_path = $upload_dir . $file_name;
                
                if (move_uploaded_file($_FILES['image']['tmp_name'], $target_path)) {
                    $image_path = $target_path;
                }
            }
            
            if (empty($name) || empty($price) || empty($category) || empty($image_path)) {
                echo json_encode(['success' => false, 'message' => 'Please fill all required fields']);
                exit;
            }
            
            $stmt = $conn->prepare("INSERT INTO products (name, description, price, category, image_path, is_on_sale, sale_price, stock_quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("ssdssidi", $name, $description, $price, $category, $image_path, $is_on_sale, $sale_price, $stock_quantity);
            
            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Product added successfully']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to add product']);
            }
        }
        elseif ($action === 'delete_product') {
            // Handle product deletion
            $product_id = intval($_POST['product_id']);
            
            // First get image path to delete file
            $stmt = $conn->prepare("SELECT image_path FROM products WHERE id = ?");
            $stmt->bind_param("i", $product_id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                $product = $result->fetch_assoc();
                if (file_exists($product['image_path'])) {
                    unlink($product['image_path']);
                }
                
                // Delete product from database
                $stmt = $conn->prepare("DELETE FROM products WHERE id = ?");
                $stmt->bind_param("i", $product_id);
                
                if ($stmt->execute()) {
                    echo json_encode(['success' => true, 'message' => 'Product deleted successfully']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Failed to delete product']);
                }
            } else {
                echo json_encode(['success' => false, 'message' => 'Product not found']);
            }
        }
        elseif ($action === 'update_product') {
            // Handle product update
            $product_id = intval($_POST['product_id']);
            $name = trim($_POST['name']);
            $description = trim($_POST['description'] ?? '');
            $price = floatval($_POST['price']);
            $category = trim($_POST['category']);
            $is_on_sale = isset($_POST['is_on_sale']) ? 1 : 0;
            $sale_price = $is_on_sale ? floatval($_POST['sale_price']) : null;
            $stock_quantity = intval($_POST['stock_quantity']);
            
            // Check if new image is uploaded
            $image_path = '';
            if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                $upload_dir = 'uploads/products/';
                if (!is_dir($upload_dir)) {
                    mkdir($upload_dir, 0755, true);
                }
                
                $file_ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
                $file_name = uniqid('product_') . '.' . $file_ext;
                $target_path = $upload_dir . $file_name;
                
                if (move_uploaded_file($_FILES['image']['tmp_name'], $target_path)) {
                    // Delete old image if exists
                    $stmt = $conn->prepare("SELECT image_path FROM products WHERE id = ?");
                    $stmt->bind_param("i", $product_id);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    
                    if ($result->num_rows > 0) {
                        $product = $result->fetch_assoc();
                        if (file_exists($product['image_path'])) {
                            unlink($product['image_path']);
                        }
                    }
                    
                    $image_path = $target_path;
                }
            }
            
            if (empty($name) || empty($price) || empty($category)) {
                echo json_encode(['success' => false, 'message' => 'Please fill all required fields']);
                exit;
            }
            
            // Update product
            if (!empty($image_path)) {
                $stmt = $conn->prepare("UPDATE products SET name = ?, description = ?, price = ?, category = ?, image_path = ?, is_on_sale = ?, sale_price = ?, stock_quantity = ? WHERE id = ?");
                $stmt->bind_param("ssdssidii", $name, $description, $price, $category, $image_path, $is_on_sale, $sale_price, $stock_quantity, $product_id);
            } else {
                $stmt = $conn->prepare("UPDATE products SET name = ?, description = ?, price = ?, category = ?, is_on_sale = ?, sale_price = ?, stock_quantity = ? WHERE id = ?");
                $stmt->bind_param("ssdsidii", $name, $description, $price, $category, $is_on_sale, $sale_price, $stock_quantity, $product_id);
            }
            
            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Product updated successfully']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to update product']);
            }
        }
    }
    elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get all products for admin
        $result = $conn->query("SELECT * FROM products ORDER BY created_at DESC");
        $products = [];
        
        while ($row = $result->fetch_assoc()) {
            $products[] = $row;
        }
        
        echo json_encode(['success' => true, 'products' => $products]);
    }
} else {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get all products for customers
        $result = $conn->query("SELECT id, name, description, price, category, image_path, is_on_sale, sale_price FROM products WHERE stock_quantity > 0 ORDER BY created_at DESC");
        $products = [];
        
        while ($row = $result->fetch_assoc()) {
            $products[] = $row;
        }
        
        echo json_encode(['success' => true, 'products' => $products]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
    }
}
?>