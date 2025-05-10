<?php
require_once __DIR__ . '/includes/config.php';

header('Content-Type: application/json');

$jsonInput = file_get_contents('php://input');
$requestData = json_decode($jsonInput, true) ?: $_POST;
$action = $requestData['action'] ?? $_GET['action'] ?? '';

if (!isset($_SESSION['user']) && $action !== 'check_login') {
    jsonResponse(false, [], 'User not logged in');
    exit;
}

$user_id = $_SESSION['user']['id'] ?? null;

// Function to check and update expired reservations
function updateExpiredReservations($pdo) {
    try {
        $pdo->beginTransaction();

        // Update expired reservations
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

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// Function to get discounted price
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
                'name' => $sale['name'],
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

try {
    // Update expired reservations before processing any action
    updateExpiredReservations($pdo);

    switch ($action) {
        case 'add_to_cart':
            $product_id = $requestData['product_id'] ?? null;
            $size = $requestData['size'] ?? null;
            $quantity = isset($requestData['quantity']) ? intval($requestData['quantity']) : 1;
            $status = $requestData['status'] ?? 'pending';

            if (!$product_id || !$size) {
                jsonResponse(false, [], 'Product ID and size are required');
            }

            // Fetch product details
            $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ? AND deleted = 0");
            $stmt->execute([$product_id]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$product) {
                jsonResponse(false, [], 'Product not found');
            }

            $sizes = json_decode($product['sizes'], true) ?: [];
            if (!isset($sizes[$size]) || $sizes[$size] < $quantity) {
                jsonResponse(false, [], 'Selected size is out of stock or insufficient quantity');
            }

            // Get discounted price
            $priceInfo = getDiscountedPrice($product, $pdo);
            $price = $priceInfo['discounted_price'];

            $total_price = $price * $quantity;

            $pdo->beginTransaction();

            // Check for existing reservation
            $stmt = $pdo->prepare("SELECT * FROM reservations 
                                  WHERE user_id = ? AND product_id = ? AND size = ? AND status IN ('pending', 'confirmed')");
            $stmt->execute([$user_id, $product_id, $size]);
            $existing_item = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($existing_item) {
                $new_quantity = $existing_item['quantity'] + $quantity;
                if ($sizes[$size] < $new_quantity) {
                    $pdo->rollBack();
                    jsonResponse(false, [], "Only {$sizes[$size]} items left in stock for this size");
                }
                $new_total_price = $price * $new_quantity;
                $stmt = $pdo->prepare("UPDATE reservations SET quantity = ?, total_price = ? WHERE id = ?");
                $stmt->execute([$new_quantity, $new_total_price, $existing_item['id']]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO reservations (user_id, product_id, size, quantity, total_price, status, reserved_at) 
                                      VALUES (?, ?, ?, ?, ?, ?, NOW())");
                $stmt->execute([$user_id, $product_id, $size, $quantity, $total_price, $status]);
            }

            // Update product stock
            $sizes[$size] -= $quantity;
            $stmt = $pdo->prepare("UPDATE products SET sizes = ? WHERE id = ?");
            $stmt->execute([json_encode($sizes), $product_id]);

            $pdo->commit();
            jsonResponse(true, ['message' => 'Item added to cart']);
            break;

        case 'get_cart':
            $stmt = $pdo->prepare("SELECT r.*, p.name AS product_name, p.image, p.price AS original_price 
                                  FROM reservations r 
                                  JOIN products p ON r.product_id = p.id 
                                  WHERE r.user_id = ? AND r.status IN ('pending', 'confirmed', 'expired')");
            $stmt->execute([$user_id]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Add expiry date, discounted price, and format image path
            foreach ($items as &$item) {
                $reserved_at = new DateTime($item['reserved_at']);
                $expiry_date = clone $reserved_at;
                $expiry_date->modify('+3 days');
                $item['expiry'] = $expiry_date->format('c');
                $item['image'] = $item['image'] ? 'assets/' . basename($item['image']) : 'assets/default-product.jpg';

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

            jsonResponse(true, ['data' => $items]);
            break;

        case 'remove_from_cart':
            $item_id = $requestData['item_id'] ?? null;
            if (!$item_id) {
                jsonResponse(false, [], 'Item ID is required');
            }

            $stmt = $pdo->prepare("SELECT * FROM reservations WHERE id = ? AND user_id = ?");
            $stmt->execute([$item_id, $user_id]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$item) {
                jsonResponse(false, [], 'Item not found');
            }

            if ($item['status'] === 'expired' || $item['status'] === 'picked') {
                jsonResponse(false, [], 'Cannot remove expired or picked items');
            }

            $pdo->beginTransaction();

            // Restore stock
            $stmt = $pdo->prepare("SELECT sizes FROM products WHERE id = ?");
            $stmt->execute([$item['product_id']]);
            $sizes = json_decode($stmt->fetchColumn(), true) ?: [];
            $sizes[$item['size']] = ($sizes[$item['size']] ?? 0) + $item['quantity'];
            $stmt = $pdo->prepare("UPDATE products SET sizes = ? WHERE id = ?");
            $stmt->execute([json_encode($sizes), $item['product_id']]);

            // Delete reservation
            $stmt = $pdo->prepare("DELETE FROM reservations WHERE id = ? AND user_id = ?");
            $stmt->execute([$item_id, $user_id]);

            $pdo->commit();
            jsonResponse(true, ['message' => 'Item removed from cart']);
            break;

        case 'update_cart_item':
            $item_id = $requestData['item_id'] ?? null;
            $status = $requestData['status'] ?? null;

            if (!$item_id || !$status) {
                jsonResponse(false, [], 'Item ID and status are required');
            }

            if (!in_array($status, ['pending', 'confirmed'])) {
                jsonResponse(false, [], 'Invalid status');
            }

            $stmt = $pdo->prepare("SELECT * FROM reservations WHERE id = ? AND user_id = ?");
            $stmt->execute([$item_id, $user_id]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$item) {
                jsonResponse(false, [], 'Item not found');
            }

            if ($item['status'] === 'expired' || $item['status'] === 'picked') {
                jsonResponse(false, [], 'Cannot update expired or picked items');
            }

            $stmt = $pdo->prepare("UPDATE reservations SET status = ?, reserved_at = COALESCE(reserved_at, NOW()) WHERE id = ? AND user_id = ?");
            $stmt->execute([$status, $item_id, $user_id]);

            jsonResponse(true, ['message' => 'Cart item updated']);
            break;

        default:
            jsonResponse(false, [], 'Invalid action');
            break;
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(false, [], 'Error: ' . $e->getMessage());
}
?>