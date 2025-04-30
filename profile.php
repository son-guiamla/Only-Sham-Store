<?php
session_start();

// Handle AJAX requests
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    header('Content-Type: application/json');
    
    $response = ['success' => false, 'message' => 'Invalid action'];
    
    switch ($_POST['action']) {
        case 'update_profile':
            if (isset($_SESSION['user_id'])) {
                $fullName = $_POST['full_name'] ?? '';
                $username = $_POST['username'] ?? '';
                $email = $_POST['email'] ?? '';
                $phone = $_POST['phone'] ?? '';
                $gender = $_POST['gender'] ?? '';
                
                // Check if username exists (excluding current user)
                $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
                $stmt->bind_param("si", $username, $_SESSION['user_id']);
                $stmt->execute();
                $stmt->store_result();
                
                if ($stmt->num_rows > 0) {
                    $response['message'] = 'Username already exists';
                } else {
                    $stmt = $conn->prepare("UPDATE users SET full_name = ?, username = ?, email = ?, phone = ?, gender = ? WHERE id = ?");
                    $stmt->bind_param("sssssi", $fullName, $username, $email, $phone, $gender, $_SESSION['user_id']);
                    
                    if ($stmt->execute()) {
                        $_SESSION['username'] = $username;
                        $_SESSION['full_name'] = $fullName;
                        $_SESSION['email'] = $email;
                        $_SESSION['phone'] = $phone;
                        $_SESSION['gender'] = $gender;
                        
                        $response['success'] = true;
                        $response['message'] = 'Profile updated successfully';
                    } else {
                        $response['message'] = 'Error updating profile';
                    }
                }
            } else {
                $response['message'] = 'Not logged in';
            }
            break;
            
        case 'update_password':
            if (isset($_SESSION['user_id'])) {
                $currentPassword = $_POST['current_password'] ?? '';
                $newPassword = $_POST['new_password'] ?? '';
                $confirmPassword = $_POST['confirm_password'] ?? '';
                
                // Verify current password
                $stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
                $stmt->bind_param("i", $_SESSION['user_id']);
                $stmt->execute();
                $result = $stmt->get_result();
                $user = $result->fetch_assoc();
                
                if (!password_verify($currentPassword, $user['password'])) {
                    $response['message'] = 'Current password is incorrect';
                } elseif ($newPassword !== $confirmPassword) {
                    $response['message'] = 'New passwords do not match';
                } elseif (strlen($newPassword) < 6) {
                    $response['message'] = 'Password must be at least 6 characters';
                } else {
                    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
                    $stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
                    $stmt->bind_param("si", $hashedPassword, $_SESSION['user_id']);
                    
                    if ($stmt->execute()) {
                        $response['success'] = true;
                        $response['message'] = 'Password updated successfully';
                    } else {
                        $response['message'] = 'Error updating password';
                    }
                }
            } else {
                $response['message'] = 'Not logged in';
            }
            break;
            
        case 'update_profile_picture':
            if (isset($_SESSION['user_id']) && isset($_FILES['profile_picture'])) {
                $targetDir = "assets/profile_pics/";
                if (!file_exists($targetDir)) {
                    mkdir($targetDir, 0777, true);
                }
                
                $fileName = $_SESSION['user_id'] . '_' . basename($_FILES['profile_picture']['name']);
                $targetFile = $targetDir . $fileName;
                $imageFileType = strtolower(pathinfo($targetFile, PATHINFO_EXTENSION));
                
                // Check if image file is a actual image
                $check = getimagesize($_FILES['profile_picture']['tmp_name']);
                if ($check === false) {
                    $response['message'] = 'File is not an image';
                } elseif ($_FILES['profile_picture']['size'] > 500000) {
                    $response['message'] = 'File is too large (max 500KB)';
                } elseif (!in_array($imageFileType, ['jpg', 'jpeg', 'png', 'gif'])) {
                    $response['message'] = 'Only JPG, JPEG, PNG & GIF files are allowed';
                } elseif (move_uploaded_file($_FILES['profile_picture']['tmp_name'], $targetFile)) {
                    // Update database
                    $stmt = $conn->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
                    $stmt->bind_param("si", $targetFile, $_SESSION['user_id']);
                    
                    if ($stmt->execute()) {
                        $_SESSION['profile_picture'] = $targetFile;
                        $response['success'] = true;
                        $response['message'] = 'Profile picture updated';
                        $response['image_url'] = $targetFile;
                    } else {
                        $response['message'] = 'Error updating database';
                    }
                } else {
                    $response['message'] = 'Error uploading file';
                }
            } else {
                $response['message'] = 'Invalid request';
            }
            break;
            
        case 'remove_profile_picture':
            if (isset($_SESSION['user_id'])) {
                $defaultImage = "assets/default-profile.png";
                $stmt = $conn->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
                $stmt->bind_param("si", $defaultImage, $_SESSION['user_id']);
                
                if ($stmt->execute()) {
                    $_SESSION['profile_picture'] = $defaultImage;
                    $response['success'] = true;
                    $response['message'] = 'Profile picture removed';
                    $response['image_url'] = $defaultImage;
                } else {
                    $response['message'] = 'Error removing profile picture';
                }
            } else {
                $response['message'] = 'Not logged in';
            }
            break;
            
        case 'get_reservations':
            if (isset($_SESSION['user_id'])) {
                // Fetch reservations from database
                $stmt = $conn->prepare("SELECT * FROM reservations WHERE user_id = ? ORDER BY created_at DESC");
                $stmt->bind_param("i", $_SESSION['user_id']);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $reservations = [];
                while ($row = $result->fetch_assoc()) {
                    $reservations[] = $row;
                }
                
                $response['success'] = true;
                $response['reservations'] = $reservations;
            } else {
                $response['message'] = 'Not logged in';
            }
            break;
            
        case 'cancel_reservation':
            if (isset($_SESSION['user_id']) && isset($_POST['reservation_id'])) {
                // Check if reservation belongs to user
                $stmt = $conn->prepare("SELECT * FROM reservations WHERE id = ? AND user_id = ?");
                $stmt->bind_param("ii", $_POST['reservation_id'], $_SESSION['user_id']);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result->num_rows > 0) {
                    // Update reservation status to cancelled
                    $stmt = $conn->prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ?");
                    $stmt->bind_param("i", $_POST['reservation_id']);
                    
                    if ($stmt->execute()) {
                        $response['success'] = true;
                        $response['message'] = 'Reservation cancelled';
                    } else {
                        $response['message'] = 'Error cancelling reservation';
                    }
                } else {
                    $response['message'] = 'Reservation not found';
                }
            } else {
                $response['message'] = 'Invalid request';
            }
            break;
    }
    
    echo json_encode($response);
    exit;
}

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

// Fetch user data
$stmt = $conn->prepare("SELECT * FROM users WHERE id = ?");
$stmt->bind_param("i", $_SESSION['user_id']);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();

if (!$user) {
    session_destroy();
    header("Location: login.php");
    exit;
}

// Update session with latest user data
$_SESSION['username'] = $user['username'];
$_SESSION['full_name'] = $user['full_name'];
$_SESSION['email'] = $user['email'];
$_SESSION['phone'] = $user['phone'];
$_SESSION['gender'] = $user['gender'];
$_SESSION['profile_picture'] = $user['profile_picture'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Profile | Only@Sham</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="profile.css">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <nav class="navbar">
        <!-- Logo -->
        <div class="logo">
            <a href="index.php">Only@Sham</a>
        </div>

        <!-- Menu Links -->
        <ul class="nav-links">
            <li><a href="index.php">Home</a></li>
            <li><a href="index.php">Shop</a></li>
            <li><a href="cart.php">Reservations</a></li>
            <li><a href="index.php">About Us</a></li>
            <li><a href="index.php">Contact</a></li>
        </ul>

        <!-- Icons -->
        <div class="nav-icons">
            <a href="cart.php" class="cart-icon"><i class="fas fa-shopping-cart"></i> <sup><span id="cart-count">0</span></sup></a>
            
            <div class="settings-icon" onclick="toggleSidebar()">
                <i class="fas fa-ellipsis-v"></i>
            </div>
        </div>

         <!-- Sidebar -->
         <div class="sidebar" id="sidebar">
            <a href="#" class="close-btn" onclick="toggleSidebar()">&times;</a>
            <a href="login.php" id="login-logout-link">Logout</a>
            <a href="#">Settings</a>
            <a href="#">Help</a>
        </div>
    </nav>

    <div class="profile-container">
        <div class="profile-header">
            <h1>My Profile</h1>
        </div>

        <div class="profile-content">
            <div class="profile-sidebar">
                <div class="profile-picture-container">
                    <div class="profile-picture-wrapper">
                        <img id="profile-picture" src="<?php echo htmlspecialchars($user['profile_picture'] ?? 'assets/default-profile.png'); ?>" alt="Profile Picture">
                        <label for="profile-upload" class="upload-btn">
                            <i class="fas fa-camera"></i>
                        </label>
                        <input type="file" id="profile-upload" accept="image/*" style="display: none;">
                    </div>
                    <button id="remove-picture-btn" class="btn-secondary">Remove Picture</button>
                </div>

                <div class="profile-menu">
                    <button class="profile-menu-btn active" data-section="personal-info">
                        <i class="fas fa-user"></i> Personal Info
                    </button>
                    <button class="profile-menu-btn" data-section="security">
                        <i class="fas fa-lock"></i> Security
                    </button>
                    <button class="profile-menu-btn" data-section="reservations">
                        <i class="fas fa-shopping-bag"></i> My Reservations
                    </button>
                </div>
            </div>

            <div class="profile-details">
                <div class="profile-section active" id="personal-info-section">
                    <h2>Personal Information</h2>
                    <form id="personal-info-form">
                        <div class="form-group">
                            <label for="full-name">Full Name</label>
                            <input type="text" id="full-name" class="input-field" value="<?php echo htmlspecialchars($user['full_name'] ?? ''); ?>" required>
                        </div>
                        <div class="form-group">
                            <label for="username">Username</label>
                            <input type="text" id="username" class="input-field" value="<?php echo htmlspecialchars($user['username'] ?? ''); ?>" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" class="input-field" value="<?php echo htmlspecialchars($user['email'] ?? ''); ?>" required>
                        </div>
                        <div class="form-group">
                            <label for="phone">Phone Number</label>
                            <input type="tel" id="phone" class="input-field" value="<?php echo htmlspecialchars($user['phone'] ?? ''); ?>">
                        </div>
                        <div class="form-group">
                            <label for="gender">Gender</label>
                            <select id="gender" class="input-field">
                                <option value="">Select Gender</option>
                                <option value="male" <?php echo (isset($user['gender']) && $user['gender'] === 'male') ? 'selected' : ''; ?>>Male</option>
                                <option value="female" <?php echo (isset($user['gender']) && $user['gender'] === 'female') ? 'selected' : ''; ?>>Female</option>
                                <option value="other" <?php echo (isset($user['gender']) && $user['gender'] === 'other') ? 'selected' : ''; ?>>Other</option>
                                <option value="prefer-not-to-say" <?php echo (isset($user['gender']) && $user['gender'] === 'prefer-not-to-say') ? 'selected' : ''; ?>>Prefer not to say</option>
                            </select>
                        </div>
                        <button type="submit" class="btn-primary">Save Changes</button>
                    </form>
                </div>

                <!-- Security Section -->
                <div class="profile-section" id="security-section">
                    <h2>Security</h2>
                    <form id="security-form">
                        <div class="form-group">
                            <label for="current-password">Current Password</label>
                            <input type="password" id="current-password" class="input-field" required>
                        </div>
                        <div class="form-group">
                            <label for="new-password">New Password</label>
                            <input type="password" id="new-password" class="input-field" required>
                        </div>
                        <div class="form-group">
                            <label for="confirm-password">Confirm New Password</label>
                            <input type="password" id="confirm-password" class="input-field" required>
                        </div>
                        <button type="submit" class="btn-primary">Update Password</button>
                    </form>
                </div>

                <!-- Reservations Section -->
                <div class="profile-section" id="reservations-section">
                    <h2>My Reservations</h2>
                    <div class="reservations-list" id="reservations-list">
                        <!-- Reservations will be loaded here via AJAX -->
                        <p class="empty-message">Loading reservations...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <footer class="footer">
        <div class="footer-content">
            <!-- Footer Links -->
            <div class="footer-links">
                <h3>Quick Links</h3>
                <ul>
                    <li><a href="#">Privacy Policy</a></li>
                    <li><a href="#">Terms & Conditions</a></li>
                    <li><a href="#">Return Policy</a></li>
                </ul>
            </div>

            <!-- Social Media Icons -->
            <div class="social-media">
                <h3>Follow Us</h3>
                <div class="social-icons">
                    <a href="#" class="social-icon"><i class="fab fa-facebook-f"></i></a>
                    <a href="#" class="social-icon"><i class="fab fa-instagram"></i></a>
                    <a href="#" class="social-icon"><i class="fab fa-tiktok"></i></a>
                </div>
            </div>
        </div>

        <!-- Footer Bottom -->
        <div class="footer-bottom">
            <p>&copy; 2023 Only@Sham. All rights reserved.</p>
        </div>
    </footer>
    
    <script src="auth.js"></script>
    <script src="profile.js"></script>
    <script src="script.js"></script>
</body>
</html>