<?php
// Include the auth_functions.php to use the db_connect function
require_once 'includes/auth_functions.php';

// Test database connection
try {
    echo "<h2>Testing Database Connection</h2>";
    
    // Attempt to connect to the database
    $conn = db_connect();
    
    if ($conn) {
        echo "<p style='color: green;'>✅ Successfully connected to the database!</p>";
        
        // Test query to fetch some data (example: list tables)
        echo "<h3>Database Information:</h3>";
        echo "<p><strong>Database Name:</strong> onlyatsham</p>";
        
        // List tables in the database
        $result = $conn->query("SHOW TABLES");
        if ($result->num_rows > 0) {
            echo "<p><strong>Tables in database:</strong></p>";
            echo "<ul>";
            while ($row = $result->fetch_row()) {
                echo "<li>" . $row[0] . "</li>";
            }
            echo "</ul>";
        } else {
            echo "<p>No tables found in the database.</p>";
        }
        
        // Close connection
        $conn->close();
    }
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Connection failed: " . $e->getMessage() . "</p>";
    echo "<p>Check your database credentials in auth_functions.php</p>";
}
?>