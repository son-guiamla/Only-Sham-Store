<?php
require_once 'config.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get':
        handleGetReviews();
        break;
    case 'add':
        handleAddReview();
        break;
    default:
        echo json_encode(["success" => false, "error" => "Invalid action"]);
        break;
}

function handleGetReviews() {
    global $conn;
    
    try {
        $stmt = $conn->prepare("SELECT r.*, u.username, u.profile_pic 
                              FROM reviews r
                              JOIN users u ON r.user_id = u.user_id
                              ORDER BY r.created_at DESC");
        $stmt->execute();
        $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "reviews" => $reviews
        ]);
    } catch (PDOException $e) {
        error_log("Database error in getReviews: " . $e->getMessage());
        echo json_encode(["success" => false, "error" => "Database error"]);
    }
}

function handleAddReview() {
    global $conn;
    verifyCsrfToken();
    
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        echo json_encode(["success" => false, "error" => "Invalid request data"]);
        return;
    }
    
    session_start();
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(["success" => false, "error" => "Not authenticated"]);
        return;
    }
    
    $rating = (int)($data['rating'] ?? 0);
    $comment = trim($data['comment'] ?? '');
    
    if ($rating < 1 || $rating > 5) {
        echo json_encode(["success" => false, "error" => "Invalid rating"]);
        return;
    }
    
    if (empty($comment)) {
        echo json_encode(["success" => false, "error" => "Comment cannot be empty"]);
        return;
    }
    
    try {
        $stmt = $conn->prepare("INSERT INTO reviews (user_id, rating, comment, created_at)
                              VALUES (:user_id, :rating, :comment, NOW())");
        $stmt->execute([
            ':user_id' => $_SESSION['user_id'],
            ':rating' => $rating,
            ':comment' => $comment
        ]);
        
        echo json_encode(["success" => true, "message" => "Review submitted"]);
    } catch (PDOException $e) {
        error_log("Database error in addReview: " . $e->getMessage());
        echo json_encode(["success" => false, "error" => "Database error"]);
    }
}
?>