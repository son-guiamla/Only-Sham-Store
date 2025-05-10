<?php
// Include the config.php to use the database connection
require_once 'includes/config.php';

// Test database connection
try {
    echo "<h2>Testing Database Connection</h2>";
    
    // Check if PDO connection is established
    if ($pdo) {
        echo "<p style='color: green;'>✅ Successfully connected to the database!</p>";
        
        // Test query to fetch some data (example: list tables)
        echo "<h3>Database Information:</h3>";
        echo "<p><strong>Database Name:</strong> " . DB_NAME . "</p>";
        
        // List tables in the database
        $result = $pdo->query("SHOW TABLES");
        if ($result->rowCount() > 0) {
            echo "<p><strong>Tables in database:</strong></p>";
            echo "<ul>";
            while ($row = $result->fetch(PDO::FETCH_NUM)) {
                echo "<li>" . htmlspecialchars($row[0]) . "</li>";
            }
            echo "</ul>";
        } else {
            echo "<p>No tables found in the database.</p>";
        }
    }
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Connection failed: " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<p>Check your database credentials in config.php</p>";
}
?>