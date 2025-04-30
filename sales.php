<?php
require_once 'config.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

if ($action === 'active') {
    handleGetActiveSales();
} else {
    echo json_encode(["success" => false, "error" => "Invalid action"]);
}

function handleGetActiveSales() {
    global $conn;
    
    try {
        $currentTime = date('Y-m-d H:i:s');
        $stmt = $conn->prepare("SELECT * FROM flash_sales 
                              WHERE start_time <= :current_time AND end_time >= :current_time
                              ORDER BY end_time ASC");
        $stmt->execute([':current_time' => $currentTime]);
        $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "sales" => $sales
        ]);
    } catch (PDOException $e) {
        error_log("Database error in getActiveSales: " . $e->getMessage());
        echo json_encode(["success" => false, "error" => "Database error"]);
    }
}
?>