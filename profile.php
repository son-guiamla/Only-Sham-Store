<?php
require_once 'config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Get user profile
    $stmt = $conn->prepare("SELECT username, email, full_name, phone, address, profile_pic FROM users WHERE id = ?");
    $stmt->bind_param("i", $_SESSION['user_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        echo json_encode(['success' => true, 'user' => $user]);
    } else {
        echo json_encode(['success' => false, 'message' => 'User not found']);
    }
}
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Update user profile
    $full_name = trim($_POST['full_name']);
    $phone = trim($_POST['phone'] ?? '');
    $address = trim($_POST['address'] ?? '');
    
    // Handle profile picture upload
    $profile_pic = null;
    if (isset($_FILES['profile_pic']) && $_FILES['profile_pic']['error'] === UPLOAD_ERR_OK) {
        $upload_dir = 'uploads/profile_pics/';
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0755, true);
        }
        
        $file_ext = pathinfo($_FILES['profile_pic']['name'], PATHINFO_EXTENSION);
        $file_name = uniqid('profile_') . '.' . $file_ext;
        $target_path = $upload_dir . $file_name;
        
        if (move_uploaded_file($_FILES['profile_pic']['tmp_name'], $target_path)) {
            // Delete old profile picture if exists
            $stmt = $conn->prepare("SELECT profile_pic FROM users WHERE id = ?");
            $stmt->bind_param("i", $_SESSION['user_id']);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                $user = $result->fetch_assoc();
                if (!empty($user['profile_pic']) && file_exists($user['profile_pic'])) {
                    unlink($user['profile_pic']);
                }
            }
            
            $profile_pic = $target_path;
        }
    }
    
    if (empty($full_name)) {
        echo json_encode(['success' => false, 'message' => 'Full name is required']);
        exit;
    }
    
    // Update user profile
    if ($profile_pic) {
        $stmt = $conn->prepare("UPDATE users SET full_name = ?, phone = ?, address = ?, profile_pic = ? WHERE id = ?");
        $stmt->bind_param("ssssi", $full_name, $phone, $address, $profile_pic, $_SESSION['user_id']);
    } else {
        $stmt = $conn->prepare("UPDATE users SET full_name = ?, phone = ?, address = ? WHERE id = ?");
        $stmt->bind_param("sssi", $full_name, $phone, $address, $_SESSION['user_id']);
    }
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update profile']);
    }
}
?>