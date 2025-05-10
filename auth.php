<?php
require_once __DIR__ . '/config.php';

// Ensure session is started
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Get JSON input or POST data
$jsonInput = file_get_contents('php://input');
$requestData = json_decode($jsonInput, true) ?: $_POST;

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action'])) {
    switch ($_GET['action']) {
        case 'check_login':
            $loggedIn = isset($_SESSION['user']) || isset($_SESSION['admin']);
            if (isset($_SESSION['user'])) {
                $stmt = $pdo->prepare("SELECT banned FROM users WHERE id = ?");
                $stmt->execute([$_SESSION['user']['id']]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($user && $user['banned']) {
                    // Clear session for banned user
                    $_SESSION = [];
                    session_destroy();
                    $loggedIn = false;
                }
            }
            jsonResponse(true, [
                'loggedIn' => $loggedIn,
                'isAdmin' => isset($_SESSION['admin'])
            ]);
            exit;
        case 'check_admin_exists':
            $stmt = $pdo->query("SELECT COUNT(*) FROM admin_users");
            jsonResponse(true, ['exists' => $stmt->fetchColumn() > 0]);
            exit;
    }
}

if (isset($requestData['action'])) {
    switch ($requestData['action']) {
        case 'admin_signup':
            $username = trim($requestData['username'] ?? '');
            $email = trim($requestData['email'] ?? '');
            $password = trim($requestData['password'] ?? '');
            $adminCode = trim($requestData['admin_code'] ?? '');

            if (empty($username) || empty($email) || empty($password) || empty($adminCode)) {
                jsonResponse(false, [], 'All fields are required');
                exit;
            }

            if ($adminCode !== ADMIN_SIGNUP_CODE) {
                jsonResponse(false, [], 'Invalid admin signup code');
                exit;
            }

            $stmt = $pdo->query("SELECT COUNT(*) FROM admin_users");
            if ($stmt->fetchColumn() > 0) {
                jsonResponse(false, [], 'Admin account already exists');
                exit;
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                jsonResponse(false, [], 'Invalid email format');
                exit;
            }

            if (strlen($password) < 8) {
                jsonResponse(false, [], 'Password must be at least 8 characters');
                exit;
            }

            try {
                $hashedPassword = hashPassword($password);

                $stmt = $pdo->prepare("INSERT INTO admin_users (username, email, password, admin_code) VALUES (?, ?, ?, ?)");
                $stmt->execute([$username, $email, $hashedPassword, $adminCode]);

                jsonResponse(true, ['redirect' => 'admin-login.php']);
            } catch (PDOException $e) {
                jsonResponse(false, [], 'Error creating admin account: ' . $e->getMessage());
            }
            exit;

        case 'login':
            $username = trim($requestData['username'] ?? '');
            $password = trim($requestData['password'] ?? '');
            $isAdminLogin = isset($requestData['is_admin']) && $requestData['is_admin'] === true;

            if (empty($username)) {
                jsonResponse(false, [], 'Username or email is required');
                exit;
            }

            if (empty($password)) {
                jsonResponse(false, [], 'Password is required');
                exit;
            }

            if ($isAdminLogin) {
                $stmt = $pdo->prepare("SELECT * FROM admin_users WHERE username = ?");
                $stmt->execute([$username]);
                $admin = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($admin && verifyPassword($password, $admin['password'])) {
                    session_regenerate_id(true);
                    $_SESSION['admin'] = [
                        'id' => $admin['id'],
                        'username' => $admin['username'],
                        'email' => $admin['email']
                    ];
                    jsonResponse(true, ['redirect' => 'admin-dashboard.php']);
                } else {
                    jsonResponse(false, [], 'Invalid admin credentials');
                }
            } else {
                $stmt = $pdo->prepare("SELECT * FROM users WHERE (username = ? OR email = ?)");
                $stmt->execute([$username, $username]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$user) {
                    jsonResponse(false, [], 'User not found');
                    exit;
                }

                if ($user['banned']) {
                    jsonResponse(false, [], 'Your account is banned. Please contact support.');
                    exit;
                }

                if (!verifyPassword($password, $user['password'])) {
                    jsonResponse(false, [], 'Invalid password');
                    exit;
                }

                session_regenerate_id(true);
                $_SESSION['user'] = $user;
                jsonResponse(true, ['redirect' => 'index.php']);
            }
            exit;

        case 'signup':
            $fullname = trim($requestData['fullname'] ?? '');
            $phone = trim($requestData['phone'] ?? '');
            $email = trim($requestData['email'] ?? '');
            $username = trim($requestData['username'] ?? '');
            $password = trim($requestData['password'] ?? '');
            $address = isset($requestData['address']) ? trim($requestData['address']) : '';

            $errors = [];

            if (empty($fullname)) {
                $errors[] = 'Full name is required';
            } elseif (strlen($fullname) > 100) {
                $errors[] = 'Full name must be less than 100 characters';
            }

            if (empty($phone)) {
                $errors[] = 'Phone number is required';
            } elseif (!preg_match('/^[0-9]{10,15}$/', $phone)) {
                $errors[] = 'Phone number must be 10-15 digits';
            }

            if (empty($email)) {
                $errors[] = 'Email is required';
            } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $errors[] = 'Valid email is required';
            } elseif (strlen($email) > 100) {
                $errors[] = 'Email must be less than 100 characters';
            }

            if (empty($username)) {
                $errors[] = 'Username is required';
            } elseif (strlen($username) > 50) {
                $errors[] = 'Username must be less than 50 characters';
            } elseif (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
                $errors[] = 'Username can only contain letters, numbers and underscores';
            }

            if (empty($password)) {
                $errors[] = 'Password is required';
            } elseif (strlen($password) < 6) {
                $errors[] = 'Password must be at least 6 characters';
            }

            if (!empty($errors)) {
                jsonResponse(false, [], implode(', ', $errors));
                exit;
            }

            $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ? OR phone = ?");
            $stmt->execute([$username, $email, $phone]);
            if ($stmt->fetch(PDO::FETCH_ASSOC)) {
                jsonResponse(false, [], 'Username, email, or phone already registered');
                exit;
            }

            try {
                $pdo->beginTransaction();
                $hashedPassword = hashPassword($password);
                $stmt = $pdo->prepare("INSERT INTO users (fullname, phone, email, username, password, address) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([$fullname, $phone, $email, $username, $hashedPassword, $address]);

                $userId = $pdo->lastInsertId();
                $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
                $stmt->execute([$userId]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$user) {
                    throw new Exception('Failed to retrieve user after registration');
                }

                $pdo->commit();
                $_SESSION['user'] = $user;
                jsonResponse(true, ['redirect' => 'index.php']);
            } catch (Exception $e) {
                $pdo->rollBack();
                jsonResponse(false, [], 'Registration failed: ' . $e->getMessage());
            }
            exit;

        case 'logout':
            $_SESSION = [];
            if (ini_get("session.use_cookies")) {
                $params = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000, $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
            }
            session_destroy();
            jsonResponse(true, ['redirect' => 'login.php']);
            exit;

        default:
            jsonResponse(false, [], 'Invalid action');
            exit;
    }
}

jsonResponse(false, [], 'Invalid action');
?>