<?php
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
    
    $valid = false;
    foreach ($users as $user) {
        if (password_verify($token, $user['token_hash'])) {
            $valid = true;
            break;
        }
    }
    
    if (!$valid) {
        throw new Exception('Invalid token');
    }
    
    echo json_encode(['success' => true]);
    
} catch (PDOException $e) {
    error_log("Database error in verify_token: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error']);
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>