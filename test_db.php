<?php
require_once 'config.php';

try {
    $stmt = $conn->query("SELECT 1");
    echo "Database connection successful!";
} catch(PDOException $e) {
    echo "Connection failed: " . $e->getMessage();
}
?>