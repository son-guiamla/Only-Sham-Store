<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');

// Get authorization header
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

if (empty($authHeader)) {
    http_response_code(401);
    die(json_encode(['success' => false, 'error' => 'Unauthorized']));
}

// Extract token
$token = str_replace('Bearer ', '', $authHeader);

try {
    // Verify token
    $stmt = $conn->prepare("SELECT * FROM users WHERE token_hash IS NOT NULL");
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $user = null;
    foreach ($users as $u) {
        if (password_verify($token, $u['token_hash'])) {
            $user = $u;
            break;
        }
    }
    
    if (!$user) {
        http_response_code(401);
        die(json_encode(['success' => false, 'error' => 'Invalid token']));
    }
    
    // Set session variables
    $_SESSION['user_id'] = $user['user_id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['is_admin'] = $user['is_admin'];
    $_SESSION['logged_in'] = true;
    
    echo json_encode(['success' => true]);
    
} catch (PDOException $e) {
    error_log("Database error in setsession: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error']);
}
?>