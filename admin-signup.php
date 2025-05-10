<?php
require_once 'includes/config.php';

// Check if admin already exists
$adminExists = $pdo->query("SELECT COUNT(*) FROM admin_users")->fetchColumn() > 0;
if ($adminExists) {
    header('Location: admin-login.php');
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Signup | Only@Sham</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="css/login.css">
</head>
<body>
    <div class="auth-container">
        <div class="auth-header">
            <h1>Admin Account Setup</h1>
            <p>Create the admin account for Only@Sham</p>
        </div>
        
        <div class="auth-forms">
            <div class="auth-form active" id="signup-form">
                <div id="signup-success" class="success-message" style="display: none;"></div>
                
                <div class="form-group">
                    <label for="signup-username">Username</label>
                    <input type="text" id="signup-username" class="form-control" placeholder="Choose a username">
                    <div class="error-message" id="signup-username-error"></div>
                </div>
                
                <div class="form-group">
                    <label for="signup-email">Email</label>
                    <input type="email" id="signup-email" class="form-control" placeholder="Enter your email">
                    <div class="error-message" id="signup-email-error"></div>
                </div>
                
                <div class="form-group">
                    <label for="signup-password">Password</label>
                    <input type="password" id="signup-password" class="form-control" placeholder="Create a password">
                    <i class="fas fa-eye password-toggle input-icon" onclick="togglePassword('signup-password', this)"></i>
                    <div class="error-message" id="signup-password-error"></div>
                </div>
                
                <div class="form-group">
                    <label for="admin-code">Admin Signup Code</label>
                    <input type="password" id="admin-code" class="form-control" placeholder="Enter admin signup code">
                    <div class="error-message" id="admin-code-error"></div>
                </div>
                
                <button class="btn btn-primary" onclick="adminSignup()">Create Admin Account</button>
                
                <div class="form-footer">
                    <a href="admin-login.php">Back to login</a>
                </div>
            </div>
        </div>
    </div>

    <script src="js/auth.js"></script>
    <script>
    function adminSignup() {
        const username = document.getElementById('signup-username')?.value.trim();
        const email = document.getElementById('signup-email')?.value.trim();
        const password = document.getElementById('signup-password')?.value.trim();
        const adminCode = document.getElementById('admin-code')?.value.trim();
        
        // Clear previous errors
        hideError('signup-username-error');
        hideError('signup-email-error');
        hideError('signup-password-error');
        hideError('admin-code-error');
        
        let valid = true;
        if (!username) { 
            showError('signup-username-error', 'Username is required'); 
            valid = false; 
        }
        if (!email) { 
            showError('signup-email-error', 'Email is required'); 
            valid = false; 
        }
        if (!password) { 
            showError('signup-password-error', 'Password is required'); 
            valid = false; 
        }
        if (!adminCode) { 
            showError('admin-code-error', 'Admin code is required'); 
            valid = false; 
        }
        if (!valid) return;
        
        fetch('includes/auth.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'admin_signup',
                username: username,
                email: email,
                password: password,
                admin_code: adminCode
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const successMessage = document.getElementById('signup-success');
                if (successMessage) {
                    successMessage.textContent = 'Admin account created! Redirecting...';
                    successMessage.style.display = 'block';
                }
                setTimeout(() => {
                    window.location.href = data.redirect || 'admin-login.php';
                }, 1500);
            } else {
                const errorField = data.field ? `signup-${data.field}-error` : 'signup-general-error';
                showError(errorField, data.error || 'Registration failed. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('signup-general-error', 'An error occurred during registration. Please try again.');
        });
    }
    </script>
</body>
</html>