<?php
require_once 'includes/config.php';

// Redirect if already logged in
if (isset($_SESSION['admin'])) {
    header('Location: admin-dashboard.php');
    exit();
}

// Check if admin account exists
$adminExists = $pdo->query("SELECT COUNT(*) FROM admin_users")->fetchColumn() > 0;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login | Only@Sham</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="css/login.css">
</head>
<body>
    <div class="auth-container">
        <div class="auth-header">
            <h1>Admin Login</h1>
            <p>Access the admin dashboard</p>
        </div>
        
        <div class="auth-forms">
            <div class="auth-form active" id="login-form">
                <div id="login-message" class="message" style="display: none;"></div>
                
                <div class="form-group">
                    <label for="login-username">Username</label>
                    <input type="text" id="login-username" class="form-control" placeholder="Enter admin username">
                    <div class="error-message" id="login-username-error"></div>
                </div>
                
                <div class="form-group">
                    <label for="login-password">Password</label>
                    <input type="password" id="login-password" class="form-control" placeholder="Enter your password">
                    <i class="fas fa-eye password-toggle input-icon" onclick="togglePassword('login-password', this)"></i>
                    <div class="error-message" id="login-password-error"></div>
                </div>
                
                <button class="btn btn-primary" onclick="adminLogin()">Login</button>
                
                <?php if (!$adminExists): ?>
                <div class="form-footer">
                    Need to setup admin? <a href="admin-signup.php">Create admin account</a>
                </div>
                <?php endif; ?>
            <div class="form-footer">
            <a href="login.php">Back to User Login</a>
        </div>
    </div>
</div>



    

    <script> 
    function togglePassword(inputId, icon) {
        const input = document.getElementById(inputId);
        if (input && icon) {
            input.type = input.type === 'password' ? 'text' : 'password';
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        }
    }

    function showError(id, message) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = message;
            el.style.display = 'block';
        }
    }

    function hideError(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }

    function showMessage(message, isError = true) {
        const msgEl = document.getElementById('login-message');
        if (msgEl) {
            msgEl.textContent = message;
            msgEl.style.display = 'block';
            msgEl.className = isError ? 'message error' : 'message success';
        }
    }

    function adminLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value.trim();
        
        hideError('login-username-error');
        hideError('login-password-error');

        let valid = true;
        if (!username) {
            showError('login-username-error', 'Username is required');
            valid = false;
        }
        
        if (!password) {
            showError('login-password-error', 'Password is required');
            valid = false;
        }
        
        if (!valid) return;

        fetch('includes/auth.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'login',
                username: username,
                password: password,
                is_admin: true
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showMessage('Login successful! Redirecting...', false);
                setTimeout(() => {
                    window.location.href = data.redirect || 'admin-dashboard.php';
                }, 1500);
            } else {
                showError('login-password-error', data.error || 'Invalid admin credentials');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('login-password-error', 'An error occurred during login. Please try again.');
        });
    }
    </script>
</body>
</html>