<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');

// Handle preflight request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        handleLogin();
        break;
    case 'register':
        handleRegister();
        break;
    case 'sendOTP':
        handleSendOTP();
        break;
    case 'resendOTP':
        handleResendOTP();
        break;
    case 'verifyOTP':
        handleVerifyOTP();
        break;
    case 'resetPassword':
        handleResetPassword();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'check':
        checkAuthStatus();
        break;
    default:
        echo json_encode(["success" => false, "error" => "Invalid action"]);
        break;
}

function handleLogin() {
    global $conn;
    
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        echo json_encode(["success" => false, "error" => "Invalid request data"]);
        return;
    }
    
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    $adminCode = $data['adminCode'] ?? '';
    
    try {
        // Check if user exists
        $stmt = $conn->prepare("SELECT * FROM users WHERE username = :username OR email = :username");
        $stmt->execute([':username' => $username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            echo json_encode(["success" => false, "error" => "Invalid username or password"]);
            return;
        }
        
        // Verify password
        if (!password_verify($password, $user['password_hash'])) {
            echo json_encode(["success" => false, "error" => "Invalid username or password"]);
            return;
        }
        
        // Check admin code if admin user
        if ($user['is_admin'] && !empty($adminCode)) {
            if ($adminCode !== $user['admin_code']) {
                echo json_encode(["success" => false, "error" => "Invalid admin code"]);
                return;
            }
        }
        
        // Check if user is banned
        if ($user['banned']) {
            echo json_encode(["success" => false, "error" => "Your account has been banned"]);
            return;
        }
        
        // Set session variables
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['is_admin'] = $user['is_admin'];
        $_SESSION['logged_in'] = true;
        
        // Return user data without sensitive info
        unset($user['password_hash']);
        unset($user['token_hash']);
        unset($user['admin_code']);
        
        echo json_encode([
            "success" => true,
            "user" => $user,
            "redirect" => $user['is_admin'] ? 'admin-dashboard.php' : 'index.php'
        ]);
    } catch (PDOException $e) {
        error_log("Database error in login: " . $e->getMessage());
        echo json_encode(["success" => false, "error" => "Database error"]);
    }
}

function handleRegister() {
    global $conn;
    
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        echo json_encode(["success" => false, "error" => "Invalid request data"]);
        return;
    }
    
    $fullname = $data['fullname'] ?? '';
    $phone = $data['phone'] ?? '';
    $email = $data['email'] ?? '';
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    $address = $data['address'] ?? '';
    
    // Validate input
    if (empty($fullname) || empty($phone) || empty($email) || empty($username) || empty($password)) {
        echo json_encode(["success" => false, "error" => "All fields except address are required"]);
        return;
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["success" => false, "error" => "Invalid email format"]);
        return;
    }
    
    if (!preg_match('/^[0-9]{10,15}$/', $phone)) {
        echo json_encode(["success" => false, "error" => "Invalid phone number"]);
        return;
    }
    
    if (strlen($password) < 6) {
        echo json_encode(["success" => false, "error" => "Password must be at least 6 characters"]);
        return;
    }
    
    try {
        // Check if username or email already exists
        $stmt = $conn->prepare("SELECT * FROM users WHERE username = :username OR email = :email OR phone = :phone");
        $stmt->execute([
            ':username' => $username,
            ':email' => $email,
            ':phone' => $phone
        ]);
        $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existingUser) {
            if ($existingUser['username'] === $username) {
                echo json_encode(["success" => false, "error" => "Username already taken"]);
            } elseif ($existingUser['email'] === $email) {
                echo json_encode(["success" => false, "error" => "Email already registered"]);
            } else {
                echo json_encode(["success" => false, "error" => "Phone number already registered"]);
            }
            return;
        }
        
        // Hash password
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        
        // Insert new user
        $stmt = $conn->prepare("INSERT INTO users (fullname, phone, email, username, password_hash, address, created_at) 
                               VALUES (:fullname, :phone, :email, :username, :password_hash, :address, NOW())");
        $stmt->execute([
            ':fullname' => $fullname,
            ':phone' => $phone,
            ':email' => $email,
            ':username' => $username,
            ':password_hash' => $passwordHash,
            ':address' => $address
        ]);
        
        // Get the new user's ID
        $userId = $conn->lastInsertId();
        
        // Set session variables
        $_SESSION['user_id'] = $userId;
        $_SESSION['username'] = $username;
        $_SESSION['email'] = $email;
        $_SESSION['is_admin'] = false;
        $_SESSION['logged_in'] = true;
        
        echo json_encode([
            "success" => true,
            "message" => "Registration successful",
            "redirect" => "index.php"
        ]);
    } catch (PDOException $e) {
        error_log("Database error in registration: " . $e->getMessage());
        echo json_encode(["success" => false, "error" => "Database error during registration"]);
    }
}

function handleSendOTP() {
    global $conn;
    
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        echo json_encode(["success" => false, "error" => "Invalid request data"]);
        return;
    }
    
    $phone = $data['phone'] ?? '';
    
    if (!preg_match('/^[0-9]{10,15}$/', $phone)) {
        echo json_encode(["success" => false, "error" => "Invalid phone number"]);
        return;
    }
    
    try {
        // Check if phone exists
        $stmt = $conn->prepare("SELECT * FROM users WHERE phone = :phone");
        $stmt->execute([':phone' => $phone]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            echo json_encode(["success" => false, "error" => "No account found with this phone number"]);
            return;
        }
        
        // Generate OTP (6 digits)
        $otp = str_pad(mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);
        
        // Store OTP in session (in production, you would send this via SMS)
        $_SESSION['reset_otp'] = $otp;
        $_SESSION['reset_phone'] = $phone;
        $_SESSION['otp_expires'] = time() + 300; // 5 minutes expiration
        
        // In a real application, you would send the OTP via SMS here
        // For demo purposes, we'll just return it
        echo json_encode([
            "success" => true,
            "message" => "OTP generated",
            "otp" => $otp // Remove this in production
        ]);
    } catch (PDOException $e) {
        error_log("Database error in sendOTP: " . $e->getMessage());
        echo json_encode(["success" => false, "error" => "Database error"]);
    }
}

function handleResendOTP() {
    global $conn;
    
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        echo json_encode(["success" => false, "error" => "Invalid request data"]);
        return;
    }
    
    $phone = $data['phone'] ?? '';
    
    if (!isset($_SESSION['reset_phone']) || $_SESSION['reset_phone'] !== $phone) {
        echo json_encode(["success" => false, "error" => "Invalid request"]);
        return;
    }
    
    try {
        // Generate new OTP
        $otp = str_pad(mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);
        
        // Update OTP in session
        $_SESSION['reset_otp'] = $otp;
        $_SESSION['otp_expires'] = time() + 300; // 5 minutes expiration
        
        // In a real application, you would send the OTP via SMS here
        echo json_encode([
            "success" => true,
            "message" => "New OTP generated",
            "otp" => $otp // Remove this in production
        ]);
    } catch (Exception $e) {
        error_log("Error in resendOTP: " . $e->getMessage());
        echo json_encode(["success" => false, "error" => "Error generating OTP"]);
    }
}

function handleVerifyOTP() {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        echo json_encode(["success" => false, "error" => "Invalid request data"]);
        return;
    }
    
    $otp = $data['otp'] ?? '';
    
    if (!isset($_SESSION['reset_otp']) || !isset($_SESSION['otp_expires'])) {
        echo json_encode(["success" => false, "error" => "OTP not requested"]);
        return;
    }
    
    if (time() > $_SESSION['otp_expires']) {
        echo json_encode(["success" => false, "error" => "OTP expired"]);
        return;
    }
    
    if ($otp !== $_SESSION['reset_otp']) {
        echo json_encode(["success" => false, "error" => "Invalid OTP"]);
        return;
    }
    
    // OTP is valid
    $_SESSION['otp_verified'] = true;
    echo json_encode(["success" => true, "message" => "OTP verified"]);
}

function handleResetPassword() {
    global $conn;
    
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        echo json_encode(["success" => false, "error" => "Invalid request data"]);
        return;
    }
    
    $phone = $data['phone'] ?? '';
    $newPassword = $data['newPassword'] ?? '';
    
    if (!isset($_SESSION['otp_verified']) || !$_SESSION['otp_verified'] || !isset($_SESSION['reset_phone']) || $_SESSION['reset_phone'] !== $phone) {
        echo json_encode(["success" => false, "error" => "Unauthorized request"]);
        return;
    }
    
    if (strlen($newPassword) < 6) {
        echo json_encode(["success" => false, "error" => "Password must be at least 6 characters"]);
        return;
    }
    
    try {
        // Hash new password
        $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
        
        // Update password
        $stmt = $conn->prepare("UPDATE users SET password_hash = :password_hash WHERE phone = :phone");
        $stmt->execute([
            ':password_hash' => $passwordHash,
            ':phone' => $phone
        ]);
        
        // Clear reset session data
        unset($_SESSION['reset_otp']);
        unset($_SESSION['otp_expires']);
        unset($_SESSION['otp_verified']);
        unset($_SESSION['reset_phone']);
        
        echo json_encode(["success" => true, "message" => "Password reset successfully"]);
    } catch (PDOException $e) {
        error_log("Database error in resetPassword: " . $e->getMessage());
        echo json_encode(["success" => false, "error" => "Database error"]);
    }
}

function handleLogout() {
    session_start();
    
    // Clear all session variables
    $_SESSION = array();
    
    // Destroy the session
    session_destroy();
    
    echo json_encode(["success" => true]);
}

function checkAuthStatus() {
    session_start();
    
    if (isset($_SESSION['logged_in']) && $_SESSION['logged_in']) {
        echo json_encode([
            "success" => true,
            "logged_in" => true,
            "user" => [
                "user_id" => $_SESSION['user_id'],
                "username" => $_SESSION['username'],
                "email" => $_SESSION['email'],
                "is_admin" => $_SESSION['is_admin']
            ]
        ]);
    } else {
        echo json_encode([
            "success" => true,
            "logged_in" => false
        ]);
    }
}
?>