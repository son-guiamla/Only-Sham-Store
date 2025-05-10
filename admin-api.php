<?php
require_once __DIR__ . '/config.php';
header('Content-Type: application/json');
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

$jsonInput = file_get_contents('php://input');
$requestData = json_decode($jsonInput, true) ?: $_POST;

if (!isset($requestData['action'])) {
    jsonResponse(false, [], 'No action specified');
    exit;
}

$action = $requestData['action'];

// Check and update expired reservations
function updateExpiredReservations($pdo) {
    $stmt = $pdo->prepare("UPDATE reservations 
                           SET status = 'expired' 
                           WHERE status IN ('pending', 'confirmed') 
                           AND reserved_at < NOW() - INTERVAL 3 DAY 
                           AND picked_at IS NULL");
    $stmt->execute();

    // Restore stock for newly expired reservations
    $stmt = $pdo->query("SELECT r.product_id, r.size, r.quantity 
                         FROM reservations r 
                         WHERE r.status = 'expired' 
                         AND r.picked_at IS NULL");
    $expired = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($expired as $reservation) {
        $stmt = $pdo->prepare("SELECT sizes FROM products WHERE id = ?");
        $stmt->execute([$reservation['product_id']]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        $sizes = json_decode($product['sizes'], true) ?: [];

        if (isset($sizes[$reservation['size']])) {
            $sizes[$reservation['size']] += $reservation['quantity'];
            $stmt = $pdo->prepare("UPDATE products SET sizes = ? WHERE id = ?");
            $stmt->execute([json_encode($sizes), $reservation['product_id']]);
        }
    }
}

// Function to calculate discounted price
function getDiscountedPrice($product, $pdo) {
    $price = floatval($product['price']);
    $discounted_price = $price;
    $discount_applied = null;

    $stmt = $pdo->query("SELECT * FROM flash_sales WHERE end_time > NOW()");
    $flash_sales = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($flash_sales as $sale) {
        $items = json_decode($sale['items'], true) ?: [];
        $isIncluded = false;

        if ($sale['scope'] === 'products') {
            $isIncluded = in_array($product['id'], $items);
        } elseif ($sale['scope'] === 'categories') {
            $isIncluded = in_array($product['category'], $items);
        }

        if ($isIncluded) {
            if ($sale['discount_type'] === 'percentage') {
                $discounted_price = $price * (1 - ($sale['discount_value'] / 100));
            } else {
                $discounted_price = max(0, $price - $sale['discount_value']);
            }
            $discount_applied = [
                'name' => str_replace('gb:', '', $sale['name']),
                'type' => $sale['discount_type'],
                'value' => $sale['discount_value']
            ];
            break;
        }
    }

    return [
        'original_price' => $price,
        'discounted_price' => $discounted_price,
        'discount_applied' => $discount_applied
    ];
}

if ($action === 'listen_updates') {
    header('GAMINGContent-Type: text/event-stream');
    header('Cache-Control: no-cache');
    header('Connection: keep-alive');
    set_time_limit(0);

    $lastEventId = $_SERVER['HTTP_LAST_EVENT_ID'] ?? 0;
    $stmt = $pdo->query("SELECT GREATEST(
        (SELECT MAX(updated_at) FROM products WHERE deleted = 0),
        (SELECT MAX(updated_at) FROM flash_sales)
    ) AS latest_update");
    $latestUpdate = $stmt->fetchColumn();

    while (true) {
        while (ob_get_level() > 0) ob_end_flush();
        echo "event: heartbeat\ndata: " . json_encode(['message' => 'Connection alive']) . "\n\n";
        flush();

        $stmt = $pdo->query("SELECT GREATEST(
            (SELECT MAX(updated_at) FROM products WHERE deleted = 0),
            (SELECT MAX(updated_at) FROM flash_sales)
        ) AS latest_update");
        $currentUpdate = $stmt->fetchColumn();

        if ($currentUpdate > $latestUpdate) {
            echo "id: " . time() . "\nevent: update\ndata: " . json_encode(['updated' => true, 'timestamp' => $currentUpdate]) . "\n\n";
            $latestUpdate = $currentUpdate;
            flush();
        }

        sleep(1);
        if (connection_aborted()) exit;
    }
    exit;
}

try {
    // Update expired reservations before handling any action
    updateExpiredReservations($pdo);

    switch ($action) {
        case 'logout':
            unset($_SESSION['admin']);
            session_destroy();
            jsonResponse(true, ['redirect' => 'admin-login.php']);
            break;

        case 'dashboard_stats':
            $stmt = $pdo->query("SELECT COUNT(*) FROM products WHERE deleted = 0");
            $total_products = $stmt->fetchColumn();

            $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE banned = 0");
            $total_users = $stmt->fetchColumn();

            $stmt = $pdo->query("SELECT COUNT(*) FROM reservations WHERE status IN ('pending', 'confirmed')");
            $active_reservations = $stmt->fetchColumn();

            $stmt = $pdo->query("SELECT COUNT(*) FROM reservations WHERE status = 'picked'");
            $picked_orders = $stmt->fetchColumn();

            $stmt = $pdo->query("SELECT SUM(total_price) FROM reservations WHERE status = 'picked'");
            $total_revenue = $stmt->fetchColumn() ?: 0.00;

            // Dynamically calculate reservation status counts
            $stmt = $pdo->query("SELECT COUNT(*) FROM reservations WHERE status = 'pending'");
            $pending_count = $stmt->fetchColumn();

            $stmt = $pdo->query("SELECT COUNT(*) FROM reservations WHERE status = 'confirmed'");
            $confirmed_count = $stmt->fetchColumn();

            $stmt = $pdo->query("SELECT COUNT(*) FROM reservations WHERE status = 'picked'");
            $picked_count = $stmt->fetchColumn();

            $stmt = $pdo->query("SELECT COUNT(*) FROM reservations WHERE status = 'expired'");
            $expired_count = $stmt->fetchColumn();

            $sales_data = [5000, 6000, 4500, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000];
            $reservation_status = [$pending_count, $confirmed_count, $picked_count, $expired_count];

            jsonResponse(true, [
                'total_products' => $total_products,
                'total_users' => $total_users,
                'active_reservations' => $active_reservations,
                'picked_orders' => $picked_orders,
                'total_revenue' => $total_revenue,
                'sales_data' => $sales_data,
                'reservation_status' => $reservation_status
            ]);
            break;

        case 'get_products':
            $query = "SELECT * FROM products WHERE deleted = 0";
            $params = [];
            if (isset($requestData['category'])) {
                $query .= " AND category = ?";
                $params[] = $requestData['category'];
            }
            if (isset($requestData['featured']) && $requestData['featured']) {
                $query .= " AND featured = 1";
            }
            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($products as &$product) {
                $product['sizes'] = json_decode($product['sizes'], true) ?: [];
                $product['image'] = $product['image'] ? $product['image'] : '';
                $priceInfo = getDiscountedPrice($product, $pdo);
                $product['original_price'] = $priceInfo['original_price'];
                $product['discounted_price'] = $priceInfo['discounted_price'];
                $product['discount_applied'] = $priceInfo['discount_applied'];
            }
            jsonResponse(true, ['products' => $products]);
            break;

        case 'get_product':
            $id = $requestData['id'] ?? null;
            if (!$id) jsonResponse(false, [], 'Product ID is required');
            $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ? AND deleted = 0");
            $stmt->execute([$id]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$product) jsonResponse(false, [], 'Product not found');
            $product['sizes'] = json_decode($product['sizes'], true) ?: [];
            $product['image'] = $product['image'] ? $product['image'] : '';
            $priceInfo = getDiscountedPrice($product, $pdo);
            $product['original_price'] = $priceInfo['original_price'];
            $product['discounted_price'] = $priceInfo['discounted_price'];
            $product['discount_applied'] = $priceInfo['discount_applied'];
            jsonResponse(true, ['product' => $product]);
            break;

        case 'add_product':
        case 'update_product':
            $id = $_POST['id'] ?? null;
            $name = trim($_POST['name'] ?? '');
            $price = floatval($_POST['price'] ?? 0);
            $category = trim($_POST['category'] ?? '');
            $description = trim($_POST['description'] ?? '');
            $featured = isset($_POST['featured']) && $_POST['featured'] === '1' ? 1 : 0;
            $sizes = json_decode($_POST['sizes'] ?? '{}', true) ?: [];

            if (empty($name)) jsonResponse(false, [], 'Product name is required');
            if ($price <= 0) jsonResponse(false, [], 'Valid price is required');
            if (empty($category)) jsonResponse(false, [], 'Category is required');
            if (empty($sizes)) jsonResponse(false, [], 'At least one size is required');

            $imagePath = null;
            if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = 'assets/';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

                $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
                $maxSize = 5 * 1024 * 1024;
                $fileType = $_FILES['image']['type'];
                $fileSize = $_FILES['image']['size'];

                if (!in_array($fileType, $allowedTypes)) jsonResponse(false, [], 'Invalid image type. Only JPEG, PNG, and GIF are allowed.');
                if ($fileSize > $maxSize) jsonResponse(false, [], 'Image size exceeds 5MB limit.');

                $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
                $uniqueName = 'product_' . uniqid() . '.' . $ext;
                $imagePath = $uploadDir . $uniqueName;

                if (!move_uploaded_file($_FILES['image']['tmp_name'], $imagePath)) {
                    jsonResponse(false, [], 'Failed to upload image.');
                }
            }

            $pdo->beginTransaction();
            if ($action === 'add_product') {
                $stmt = $pdo->prepare("INSERT INTO products (name, price, category, description, image, featured, sizes) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$name, $price, $category, $description, $imagePath ?: '', $featured, json_encode($sizes)]);
            } else {
                $stmt = $pdo->prepare("SELECT image FROM products WHERE id = ?");
                $stmt->execute([$id]);
                $existingImage = $stmt->fetchColumn();
                $stmt = $pdo->prepare("UPDATE products SET name = ?, price = ?, category = ?, description = ?, image = ?, featured = ?, sizes = ? WHERE id = ?");
                $stmt->execute([$name, $price, $category, $description, $imagePath ?: $existingImage, $featured, json_encode($sizes), $id]);
            }
            $pdo->commit();

            $stmt = $pdo->query("SELECT MAX(updated_at) FROM products WHERE deleted = 0");
            $updated_at = $stmt->fetchColumn();
            $stmt = $pdo->query("UPDATE products SET updated_at = NOW() WHERE id = (SELECT MIN(id) FROM products)");
            jsonResponse(true, ['message' => 'Product saved successfully', 'updated_at' => $updated_at]);
            break;

        case 'delete_product':
            $id = $requestData['id'] ?? null;
            if (!$id) jsonResponse(false, [], 'Product ID is required');
            $stmt = $pdo->prepare("UPDATE products SET deleted = 1 WHERE id = ?");
            $stmt->execute([$id]);
            $stmt = $pdo->query("SELECT MAX(updated_at) FROM products WHERE deleted = 0");
            $updated_at = $stmt->fetchColumn();
            $stmt = $pdo->query("UPDATE products SET updated_at = NOW() WHERE id = (SELECT MIN(id) FROM products)");
            jsonResponse(true, ['message' => 'Product deleted successfully', 'updated_at' => $updated_at]);
            break;

        case 'add_to_cart':
            if (!isset($_SESSION['user'])) {
                jsonResponse(false, [], 'You need to login to add items to cart');
                break;
            }
            $productId = $requestData['product_id'] ?? null;
            $size = $requestData['size'] ?? null;
            $quantity = intval($requestData['quantity'] ?? 1);
            $userId = $_SESSION['user']['id'];

            if (!$productId || !$size) {
                jsonResponse(false, [], 'Product ID and size are required');
                break;
            }

            $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ? AND deleted = 0");
            $stmt->execute([$productId]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$product) {
                jsonResponse(false, [], 'Product not found');
                break;
            }

            $sizes = json_decode($product['sizes'], true) ?: [];
            if (!isset($sizes[$size]) || $sizes[$size] < $quantity) {
                jsonResponse(false, [], 'Selected size is out of stock or insufficient quantity');
                break;
            }

            $priceInfo = getDiscountedPrice($product, $pdo);
            $price = $priceInfo['discounted_price'];

            $stmt = $pdo->prepare("SELECT * FROM reservations WHERE user_id = ? AND product_id = ? AND size = ? AND status IN ('pending', 'confirmed')");
            $stmt->execute([$userId, $productId, $size]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);

            $pdo->beginTransaction();
            try {
                if ($existing) {
                    $newQuantity = $existing['quantity'] + $quantity;
                    if ($sizes[$size] < $newQuantity) {
                        $pdo->rollBack();
                        jsonResponse(false, [], "Only {$sizes[$size]} items left in stock for this size");
                        break;
                    }
                    $stmt = $pdo->prepare("UPDATE reservations SET quantity = ?, total_price = ? WHERE id = ?");
                    $stmt->execute([$newQuantity, $newQuantity * $price, $existing['id']]);
                } else {
                    $stmt = $pdo->prepare("INSERT INTO reservations (user_id, product_id, size, quantity, total_price, status, reserved_at) VALUES (?, ?, ?, ?, ?, 'pending', NOW())");
                    $stmt->execute([$userId, $productId, $size, $quantity, $quantity * $price]);
                }

                $sizes[$size] -= $quantity;
                $stmt = $pdo->prepare("UPDATE products SET sizes = ? WHERE id = ?");
                $stmt->execute([json_encode($sizes), $productId]);
                $pdo->commit();

                jsonResponse(true, ['message' => 'Product added to cart']);
            } catch (Exception $e) {
                $pdo->rollBack();
                jsonResponse(false, [], 'Error: ' . $e->getMessage());
            }
            break;

        case 'get_cart':
            if (!isset($_SESSION['user'])) {
                error_log("get_cart: No user session found");
                jsonResponse(true, ['cart' => []]);
            }
            error_log("get_cart: User ID = " . $_SESSION['user']['id']);
            $stmt = $pdo->prepare("SELECT r.*, p.name, p.price AS original_price, p.image 
                                   FROM reservations r 
                                   JOIN products p ON r.product_id = p.id 
                                   WHERE r.user_id = ? AND r.status IN ('pending', 'confirmed', 'expired')");
            $stmt->execute([$_SESSION['user']['id']]);
            $cartItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($cartItems as &$item) {
                $reservedAt = new DateTime($item['reserved_at']);
                $expiryDate = $reservedAt->modify('+3 days');
                $item['expiry'] = $expiryDate->format('c');
                $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ? AND deleted = 0");
                $stmt->execute([$item['product_id']]);
                $product = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($product) {
                    $priceInfo = getDiscountedPrice($product, $pdo);
                    $item['discounted_price'] = $priceInfo['discounted_price'];
                    $item['discount_applied'] = $priceInfo['discount_applied'];
                } else {
                    $item['discounted_price'] = $item['original_price'];
                    $item['discount_applied'] = null;
                }
            }

            error_log("get_cart: Found " . count($cartItems) . " cart items");
            jsonResponse(true, ['cart' => $cartItems]);
            break;

        case 'confirm_cart_item':
            if (!isset($_SESSION['user'])) {
                jsonResponse(false, [], 'You need to login to confirm items');
            }
            $productId = $requestData['product_id'] ?? null;
            $size = $requestData['size'] ?? null;

            if (!$productId || !$size) {
                jsonResponse(false, [], 'Product ID and size are required');
            }

            $stmt = $pdo->prepare("SELECT * FROM reservations 
                                   WHERE user_id = ? AND product_id = ? AND size = ? AND status = 'pending'");
            $stmt->execute([$_SESSION['user']['id'], $productId, $size]);
            $reservation = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$reservation) {
                jsonResponse(false, [], 'Reservation not found or already confirmed/expired');
            }

            $stmt = $pdo->prepare("UPDATE reservations SET status = 'confirmed' WHERE id = ?");
            $stmt->execute([$reservation['id']]);

            jsonResponse(true, ['message' => 'Item confirmed successfully']);
            break;

        case 'remove_from_cart':
            if (!isset($_SESSION['user'])) {
                jsonResponse(false, [], 'You need to login to remove items');
            }
            $productId = $requestData['product_id'] ?? null;
            $size = $requestData['size'] ?? null;

            if (!$productId || !$size) {
                jsonResponse(false, [], 'Product ID and size are required');
            }

            $stmt = $pdo->prepare("SELECT * FROM reservations 
                                   WHERE user_id = ? AND product_id = ? AND size = ? AND status IN ('pending', 'confirmed')");
            $stmt->execute([$_SESSION['user']['id'], $productId, $size]);
            $reservation = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$reservation) {
                jsonResponse(false, [], 'Reservation not found or cannot be cancelled');
            }

            $pdo->beginTransaction();

            // Restore stock
            $stmt = $pdo->prepare("SELECT sizes FROM products WHERE id = ?");
            $stmt->execute([$productId]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            $sizes = json_decode($product['sizes'], true) ?: [];

            if (isset($sizes[$size])) {
                $sizes[$size] += $reservation['quantity'];
                $stmt = $pdo->prepare("UPDATE products SET sizes = ? WHERE id = ?");
                $stmt->execute([json_encode($sizes), $productId]);
            }

            // Mark reservation as cancelled
            $stmt = $pdo->prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ?");
            $stmt->execute([$reservation['id']]);

            $pdo->commit();

            jsonResponse(true, ['message' => 'Item removed from cart']);
            break;

        case 'get_cart_count':
            if (!isset($_SESSION['user'])) {
                jsonResponse(true, ['count' => 0]);
            }
            $stmt = $pdo->prepare("SELECT SUM(quantity) FROM reservations 
                                   WHERE user_id = ? AND status IN ('pending', 'confirmed')");
            $stmt->execute([$_SESSION['user']['id']]);
            $count = $stmt->fetchColumn() ?: 0;
            jsonResponse(true, ['count' => $count]);
            break;

        case 'get_reservations':
            $stmt = $pdo->query("SELECT r.*, u.fullname AS customer_name, p.name AS product_name 
                                FROM reservations r 
                                JOIN users u ON r.user_id = u.id 
                                JOIN products p ON r.product_id = p.id");
            $reservations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            jsonResponse(true, ['reservations' => $reservations]);
            break;

        case 'mark_reservation_picked':
            $id = $requestData['id'] ?? null;
            if (!$id) jsonResponse(false, [], 'Reservation ID is required');
            $stmt = $pdo->prepare("UPDATE reservations SET status = 'picked', picked_at = NOW() 
                                   WHERE id = ? AND status = 'confirmed'");
            $stmt->execute([$id]);
            if ($stmt->rowCount() === 0) jsonResponse(false, [], 'Reservation cannot be marked as picked');
            jsonResponse(true, ['message' => 'Reservation marked as picked']);
            break;

        case 'cancel_reservation':
            $id = $requestData['id'] ?? null;
            if (!$id) jsonResponse(false, [], 'Reservation ID is required');
            
            $stmt = $pdo->prepare("SELECT * FROM reservations WHERE id = ?");
            $stmt->execute([$id]);
            $reservation = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$reservation) jsonResponse(false, [], 'Reservation not found');

            if ($reservation['status'] === 'picked' || $reservation['status'] === 'expired') {
                jsonResponse(false, [], 'Reservation cannot be cancelled');
            }

            $pdo->beginTransaction();

            // Restore stock
            $stmt = $pdo->prepare("SELECT sizes FROM products WHERE id = ?");
            $stmt->execute([$reservation['product_id']]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            $sizes = json_decode($product['sizes'], true) ?: [];

            if (isset($sizes[$reservation['size']])) {
                $sizes[$reservation['size']] += $reservation['quantity'];
                $stmt = $pdo->prepare("UPDATE products SET sizes = ? WHERE id = ?");
                $stmt->execute([json_encode($sizes), $reservation['product_id']]);
            }

            // Mark reservation as cancelled
            $stmt = $pdo->prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ?");
            $stmt->execute([$id]);

            $pdo->commit();

            jsonResponse(true, ['message' => 'Reservation cancelled']);
            break;

        case 'get_order_history':
            $stmt = $pdo->query("SELECT r.*, u.fullname AS customer_name, p.name AS product_name 
                                FROM reservations r 
                                JOIN users u ON r.user_id = u.id 
                                JOIN products p ON r.product_id = p.id 
                                WHERE r.status IN ('picked', 'cancelled')");
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
            jsonResponse(true, ['orders' => $orders]);
            break;

        case 'get_order_details':
            $id = $requestData['id'] ?? null;
            if (!$id) jsonResponse(false, [], 'Order ID is required');
            $stmt = $pdo->prepare("SELECT r.*, u.fullname AS customer_name, p.name AS product_name 
                                  FROM reservations r 
                                  JOIN users u ON r.user_id = u.id 
                                  JOIN products p ON r.product_id = p.id 
                                  WHERE r.id = ?");
            $stmt->execute([$id]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$order) jsonResponse(false, [], 'Order not found');
            jsonResponse(true, ['order' => $order]);
            break;

        case 'get_users':
            $stmt = $pdo->query("SELECT u.*, 
                                (SELECT COUNT(*) FROM reservations r WHERE r.user_id = u.id AND r.status IN ('pending', 'confirmed')) AS active_reservations,
                                (SELECT COUNT(*) FROM reservations r WHERE r.user_id = u.id AND r.status = 'picked') AS picked_reservations,
                                (SELECT COUNT(*) FROM reservations r WHERE r.user_id = u.id AND r.status = 'expired') AS expired_reservations
                                FROM users u");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            jsonResponse(true, ['users' => $users]);
            break;

        case 'toggle_user_status':
            $id = $requestData['id'] ?? null;
            $status = $requestData['status'] ?? null;
            if (!$id || !$status) jsonResponse(false, [], 'User ID and status are required');
            $newStatus = $status === 'active' ? 0 : 1;
            $stmt = $pdo->prepare("UPDATE users SET banned = ? WHERE id = ?");
            $stmt->execute([$newStatus, $id]);
            jsonResponse(true, ['message' => 'User status updated']);
            break;

        case 'get_feedback':
            $stmt = $pdo->query("SELECT f.*, u.username, u.profile_image 
                                FROM feedback f 
                                JOIN users u ON f.user_id = u.id");
            $feedback = $stmt->fetchAll(PDO::FETCH_ASSOC);
            jsonResponse(true, ['feedback' => $feedback]);
            break;

        case 'delete_feedback':
            $id = $requestData['id'] ?? null;
            if (!$id) jsonResponse(false, [], 'Feedback ID is required');
            $stmt = $pdo->prepare("DELETE FROM feedback WHERE id = ?");
            $stmt->execute([$id]);
            jsonResponse(true, ['message' => 'Feedback deleted']);
            break;

        case 'get_flash_sales':
            $stmt = $pdo->query("SELECT * FROM flash_sales");
            $flash_sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($flash_sales as &$sale) {
                $items = json_decode($sale['items'], true) ?: [];
                $sale['products'] = $sale['scope'] === 'products' ? $items : [];
                $sale['categories'] = $sale['scope'] === 'categories' ? $items : [];
                $sale['status'] = (new DateTime($sale['end_time']) > new DateTime()) ? 'active' : 'ended';
            }
            jsonResponse(true, ['flash_sales' => $flash_sales]);
            break;

        case 'get_flash_sale':
            $id = $requestData['id'] ?? null;
            if (!$id) jsonResponse(false, [], 'Flash sale ID is required');
            $stmt = $pdo->prepare("SELECT * FROM flash_sales WHERE id = ?");
            $stmt->execute([$id]);
            $sale = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$sale) jsonResponse(false, [], 'Flash sale not found');
            $items = json_decode($sale['items'], true) ?: [];
            $sale['products'] = $sale['scope'] === 'products' ? $items : [];
            $sale['categories'] = $sale['scope'] === 'categories' ? $items : [];
            jsonResponse(true, ['flash_sale' => $sale]);
            break;

        case 'add_flash_sale':
        case 'update_flash_sale':
            $id = $requestData['id'] ?? null;
            $name = trim($requestData['name'] ?? '');
            $scope = $requestData['scope'] ?? '';
            $discount_type = $requestData['discount_type'] ?? '';
            $discount_value = floatval($requestData['discount_value'] ?? 0);
            $start_time = $requestData['start_time'] ?? '';
            $end_time = $requestData['end_time'] ?? '';
            $products = $requestData['products'] ?? [];
            $categories = $requestData['categories'] ?? [];
        
            if (empty($name)) jsonResponse(false, [], 'Sale name is required');
            if (!in_array($scope, ['products', 'categories'])) jsonResponse(false, [], 'Invalid scope');
            if (!in_array($discount_type, ['percentage', 'fixed'])) jsonResponse(false, [], 'Invalid discount type');
            if ($discount_value <= 0) jsonResponse(false, [], 'Valid discount value is required');
            if ($discount_type === 'percentage' && $discount_value > 100) jsonResponse(false, [], 'Percentage discount cannot exceed 100%');
            if (empty($start_time) || empty($end_time)) jsonResponse(false, [], 'Start and end times are required');
            if (strtotime($end_time) <= strtotime($start_time)) jsonResponse(false, [], 'End time must be after start time');
            if ($scope === 'products' && empty($products) && !$id) jsonResponse(false, [], 'At least one product is required');
            if ($scope === 'categories' && empty($categories) && !$id) jsonResponse(false, [], 'At least one category is required');
        
            $items = $scope === 'products' ? $products : $categories;
            $pdo->beginTransaction();
            if ($action === 'add_flash_sale') {
                $stmt = $pdo->prepare("INSERT INTO flash_sales (name, scope, discount_type, discount_value, start_time, end_time, items) 
                                      VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$name, $scope, $discount_type, $discount_value, $start_time, $end_time, json_encode($items)]);
            } else {
                // Fetch existing flash sale to preserve unchanged data
                $stmt = $pdo->prepare("SELECT * FROM flash_sales WHERE id = ?");
                $stmt->execute([$id]);
                $existingSale = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$existingSale) jsonResponse(false, [], 'Flash sale not found');
        
                // Update only the changed fields
                $updatedItems = $scope === 'products' ? $products : $categories;
                $stmt = $pdo->prepare("UPDATE flash_sales SET name = ?, scope = ?, discount_type = ?, discount_value = ?, start_time = ?, end_time = ?, items = ? 
                                      WHERE id = ?");
                $stmt->execute([$name, $scope, $discount_type, $discount_value, $start_time, $end_time, json_encode($updatedItems), $id]);
            }
            $pdo->commit();
        
            $stmt = $pdo->query("SELECT MAX(updated_at) FROM flash_sales");
            $updated_at = $stmt->fetchColumn();
            $stmt = $pdo->query("UPDATE flash_sales SET updated_at = NOW() WHERE id = (SELECT MIN(id) FROM flash_sales)");
            jsonResponse(true, ['message' => 'Flash sale saved successfully', 'updated_at' => $updated_at]);
            break;

        case 'delete_flash_sale':
            $id = $requestData['id'] ?? null;
            if (!$id) jsonResponse(false, [], 'Flash sale ID is required');
            $stmt = $pdo->prepare("DELETE FROM flash_sales WHERE id = ?");
            $stmt->execute([$id]);
            $stmt = $pdo->query("SELECT MAX(updated_at) FROM flash_sales");
            $updated_at = $stmt->fetchColumn();
            $stmt = $pdo->query("UPDATE flash_sales SET updated_at = NOW() WHERE id = (SELECT MIN(id) FROM flash_sales)");
            jsonResponse(true, ['message' => 'Flash sale deleted', 'updated_at' => $updated_at]);
            break;

        case 'get_active_flash_sales':
            $stmt = $pdo->query("SELECT * FROM flash_sales WHERE end_time > NOW()");
            $flash_sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($flash_sales as &$sale) {
                $sale['items'] = json_decode($sale['items'], true) ?: [];
            }
            jsonResponse(true, ['flash_sales' => $flash_sales]);
            break;

        case 'check_updates':
            $stmt = $pdo->query("SELECT GREATEST(
                (SELECT MAX(updated_at) FROM products WHERE deleted = 0),
                (SELECT MAX(updated_at) FROM flash_sales)
            ) AS latest_update");
            $latest_update = $stmt->fetchColumn();
            jsonResponse(true, ['updated_at' => $latest_update]);
            break;

        case 'notify_update':
            $stmt = $pdo->query("UPDATE products SET updated_at = NOW() WHERE id = (SELECT MIN(id) FROM products)");
            jsonResponse(true, ['message' => 'Update notification sent']);
            break;

        default:
            jsonResponse(false, [], 'Invalid action');
            break;
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    jsonResponse(false, [], 'Error: ' . $e->getMessage());
}
?>