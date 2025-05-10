<?php
require_once __DIR__ . '/config.php';

// Check if user is logged in
if (!isset($_SESSION['user'])) {
    jsonResponse(false, [], 'Please login first');
}

$userId = $_SESSION['user']['id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action'])) {
    switch ($_GET['action']) {
        case 'check_login':
            jsonResponse(true, ['loggedIn' => isset($_SESSION['user'])]);
            break;

        case 'get_profile_data':
            try {
                $stmt = $pdo->prepare("SELECT fullname, username, email, phone, gender, profile_picture FROM users WHERE id = ?");
                $stmt->execute([$userId]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($user) {
                    jsonResponse(true, ['user' => $user]);
                } else {
                    jsonResponse(false, [], 'User not found');
                }
            } catch (Exception $e) {
                jsonResponse(false, [], 'Error fetching profile data: ' . $e->getMessage());
            }
            break;

        case 'get_profile_picture':
            $image = $_SESSION['user']['profile_picture'] ?? 'assets/default-profile.png';
            jsonResponse(true, ['image' => $image]);
            break;

        case 'get_reservations':
            try {
                // Get active reservations with product details
                $stmt = $pdo->prepare("
                    SELECT r.*, p.name, p.image, p.price
                    FROM reservations r
                    JOIN products p ON r.product_id = p.id
                    WHERE r.user_id = ? AND r.status IN ('pending', 'confirmed')
                ");
                $stmt->execute([$userId]);
                $activeReservations = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Get picked items with product details
                $stmt = $pdo->prepare("
                    SELECT r.*, p.name, p.image, p.price
                    FROM reservations r
                    JOIN products p ON r.product_id = p.id
                    WHERE r.user_id = ? AND r.status = 'picked'
                ");
                $stmt->execute([$userId]);
                $pickedItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

                jsonResponse(true, [
                    'reservations' => [
                        'active' => $activeReservations,
                        'picked' => $pickedItems
                    ]
                ]);
            } catch (Exception $e) {
                jsonResponse(false, [], 'Error fetching reservations: ' . $e->getMessage());
            }
            break;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    switch ($_POST['action']) {
        case 'update_profile_picture':
            try {
                $imagePath = $_SESSION['user']['profile_picture'] ?? 'assets/default-profile.png';
                
                if (isset($_POST['default_image']) {
                    $imagePath = 'assets/default-profile.png';
                } elseif (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                    $uploadDir = 'assets/';
                    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

                    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
                    $maxSize = 5 * 1024 * 1024;
                    $fileType = $_FILES['image']['type'];
                    $fileSize = $_FILES['image']['size'];

                    if (!in_array($fileType, $allowedTypes)) {
                        jsonResponse(false, [], 'Invalid image type. Only JPEG, PNG, and GIF are allowed.');
                    }
                    if ($fileSize > $maxSize) {
                        jsonResponse(false, [], 'Image size exceeds 5MB limit.');
                    }

                    $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
                    $uniqueName = 'profile_' . $userId . '_' . uniqid() . '.' . $ext;
                    $imagePath = $uploadDir . $uniqueName;

                    if (!move_uploaded_file($_FILES['image']['tmp_name'], $imagePath)) {
                        jsonResponse(false, [], 'Failed to upload image.');
                    }
                }

                $stmt = $pdo->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
                $stmt->execute([$imagePath, $userId]);

                // Update session
                $_SESSION['user']['profile_picture'] = $imagePath;
                jsonResponse(true);
            } catch (Exception $e) {
                jsonResponse(false, [], 'Error updating profile picture: ' . $e->getMessage());
            }
            break;

        case 'update_personal_info':
            $fullname = trim($_POST['full-name'] ?? '');
            $username = trim($_POST['username'] ?? '');
            $email = trim($_POST['email'] ?? '');
            $phone = trim($_POST['phone'] ?? '');
            $gender = trim($_POST['gender'] ?? '');

            if (empty($fullname)) {
                jsonResponse(false, [], 'Full name is required');
            }
            if (empty($username)) {
                jsonResponse(false, [], 'Username is required');
            }
            if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                jsonResponse(false, [], 'Valid email is required');
            }

            try {
                // Check for duplicate username or email
                $stmt = $pdo->prepare("SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?");
                $stmt->execute([$username, $email, $userId]);
                if ($stmt->fetch()) {
                    jsonResponse(false, [], 'Username or email already exists');
                }

                $pdo->beginTransaction();
                $stmt = $pdo->prepare("UPDATE users 
                                      SET fullname = ?, username = ?, email = ?, phone = ?, gender = ?
                                      WHERE id = ?");
                $stmt->execute([$fullname, $username, $email, $phone, $gender, $userId]);

                // Update session
                $_SESSION['user'] = array_merge($_SESSION['user'], [
                    'fullname' => $fullname,
                    'username' => $username,
                    'email' => $email,
                    'phone' => $phone,
                    'gender' => $gender
                ]);

                $pdo->commit();
                jsonResponse(true);
            } catch (Exception $e) {
                $pdo->rollBack();
                jsonResponse(false, [], 'Error updating personal info: ' . $e->getMessage());
            }
            break;

        case 'update_password':
            $currentPassword = $_POST['current-password'] ?? '';
            $newPassword = $_POST['new-password'] ?? '';
            $confirmPassword = $_POST['confirm-password'] ?? '';

            if (empty($currentPassword) || empty($newPassword) || empty($confirmPassword)) {
                jsonResponse(false, [], 'All password fields are required');
            }

            if ($newPassword !== $confirmPassword) {
                jsonResponse(false, [], 'New passwords do not match');
            }

            if (strlen($newPassword) < 6) {
                jsonResponse(false, [], 'Password must be at least 6 characters');
            }

            try {
                // Verify current password
                $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
                $stmt->execute([$userId]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!password_verify($currentPassword, $user['password'])) {
                    jsonResponse(false, [], 'Current password is incorrect');
                }

                $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);

                $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
                $stmt->execute([$hashedPassword, $userId]);
                jsonResponse(true);
            } catch (Exception $e) {
                jsonResponse(false, [], 'Error updating password: ' . $e->getMessage());
            }
            break;

        case 'cancel_reservation':
            $reservationId = (int)($_POST['reservation_id'] ?? 0);
            $isPicked = $_POST['is_picked'] === 'true';

            try {
                $pdo->beginTransaction();

                if (!$isPicked) {
                    // Get reservation details to restore stock
                    $stmt = $pdo->prepare("SELECT product_id, size, quantity 
                                          FROM reservations 
                                          WHERE id = ? AND user_id = ?");
                    $stmt->execute([$reservationId, $userId]);
                    $reservation = $stmt->fetch(PDO::FETCH_ASSOC);

                    if ($reservation) {
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
                    }
                }

                // Delete the reservation
                $stmt = $pdo->prepare("DELETE FROM reservations 
                                      WHERE id = ? AND user_id = ?");
                $stmt->execute([$reservationId, $userId]);

                $pdo->commit();
                jsonResponse(true);
            } catch (Exception $e) {
                $pdo->rollBack();
                jsonResponse(false, [], 'Error canceling reservation: ' . $e->getMessage());
            }
            break;
    }
}
?>