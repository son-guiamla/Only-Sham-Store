<?php
require_once 'includes/config.php';

// Redirect if already logged in
if (isset($_SESSION['user'])) {
    header('Location: index.php');
    exit();
} elseif (isset($_SESSION['admin'])) {
    header('Location: admin-dashboard.php');
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Login | Only@Sham</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"/>
  <link rel="stylesheet" href="css/login.css">
</head>
<body>
  <div class="auth-container">
    <div class="auth-header">
      <h1>Welcome to Only@Sham</h1>
      <p>Login or create an account to reserve products</p>
      <div class="auth-tabs">
        <div class="auth-tab active" onclick="switchTab('login')">Login</div>
        <div class="auth-tab" onclick="switchTab('signup')">Sign Up</div>
      </div>
    </div>
    <div class="auth-forms">
      <!-- Login Form -->
      <div class="auth-form active" id="login-form">
        <div id="login-success" class="success-message" style="display: none;"></div>

        <div class="form-group">
          <label for="login-username">Username or Email</label>
          <input type="text" id="login-username" class="form-control" placeholder="Enter your username or email">
          <div class="error-message" id="login-username-error"></div>
        </div>
        
        <div class="form-group">
          <label for="login-password">Password</label>
          <input type="password" id="login-password" class="form-control" placeholder="Enter your password">
          <i class="fas fa-eye password-toggle input-icon" onclick="togglePassword('login-password', this)"></i>
          <div class="error-message" id="login-password-error"></div>
        </div>

        <div class="forgot-password">
          <a href="#" onclick="showForgotPasswordModal()">Forgot Password?</a>
        </div>

        <button class="btn btn-primary" onclick="login()">Login</button>

        <div class="form-footer">
          Don't have an account? <a href="#" onclick="switchTab('signup')">Sign up here</a>
          <div class="admin-login-link">
            <a href="admin-login.php">Log in as Admin</a>
          </div>
        </div>
      </div>
      <!-- Signup Form -->
      <div class="auth-form" id="signup-form">
        <div id="signup-success" class="success-message" style="display: none;"></div>

        <div class="form-group">
          <label for="signup-fullname">Full Name</label>
          <input type="text" id="signup-fullname" class="form-control" placeholder="Enter your full name">
          <div class="error-message" id="signup-fullname-error"></div>
        </div>

        <div class="form-group">
          <label for="signup-phone">Phone Number</label>
          <input type="tel" id="signup-phone" class="form-control" placeholder="Enter your phone number">
          <div class="error-message" id="signup-phone-error"></div>
        </div>

        <div class="form-group">
          <label for="signup-email">Email</label>
          <input type="email" id="signup-email" class="form-control" placeholder="Enter your email">
          <div class="error-message" id="signup-email-error"></div>
        </div>

        <div class="form-group">
          <label for="signup-username">Username</label>
          <input type="text" id="signup-username" class="form-control" placeholder="Choose a username">
          <div class="error-message" id="signup-username-error"></div>
        </div>

        <div class="form-group">
          <label for="signup-password">Password</label>
          <input type="password" id="signup-password" class="form-control" placeholder="Create a password">
          <i class="fas fa-eye password-toggle input-icon" onclick="togglePassword('signup-password', this)"></i>
          <div class="error-message" id="signup-password-error"></div>
        </div>

        <div class="form-group">
          <label for="signup-address">Address (Optional)</label>
          <textarea id="signup-address" class="form-control" rows="2" placeholder="Enter your address"></textarea>
        </div>

        <button class="btn btn-primary" onclick="signup()">Create Account</button>

        <div class="form-footer">
          Already have an account? <a href="#" onclick="switchTab('login')">Login here</a>
        </div>
      </div>
    </div>
  </div>

  <!-- Forgot Password Modal -->
  <div id="forgotPasswordModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Reset Password</h2>
      </div>
      
      <div id="forgot-password-step1">
        <div class="form-group">
          <label for="forgot-phone">Phone Number</label>
          <input type="tel" id="forgot-phone" class="form-control" placeholder="Enter your registered phone number">
          <div class="error-message" id="forgot-phone-error"></div>
        </div>
        
        <button class="btn btn-primary" onclick="sendOTP()">Send OTP</button>
      </div>
      
      <div id="forgot-password-step2" style="display: none;">
        <p>We've sent a 6-digit OTP to your phone number ending with <span id="phone-mask"></span></p>
        
        <div class="otp-container">
          <input type="text" class="otp-input" maxlength="1" data-index="1">
          <input type="text" class="otp-input" maxlength="1" data-index="2">
          <input type="text" class="otp-input" maxlength="1" data-index="3">
          <input type="text" class="otp-input" maxlength="1" data-index="4">
          <input type="text" class="otp-input" maxlength="1" data-index="5">
          <input type="text" class="otp-input" maxlength="1" data-index="6">
        </div>
        
        <div class="error-message" id="otp-error"></div>
        
        <div class="resend-otp">
          Didn't receive code? <a href="#" onclick="resendOTP()">Resend</a>
        </div>
        
        <button class="btn btn-primary" onclick="verifyOTP()">Verify OTP</button>
      </div>
      
      <div id="forgot-password-step3" style="display: none;">
        <div class="form-group">
          <label for="new-password">New Password</label>
          <input type="password" id="new-password" class="form-control" placeholder="Enter new password">
          <i class="fas fa-eye password-toggle input-icon" onclick="togglePassword('new-password', this)"></i>
          <div class="error-message" id="new-password-error"></div>
        </div>
        
        <div class="form-group">
          <label for="confirm-password">Confirm Password</label>
          <input type="password" id="confirm-password" class="form-control" placeholder="Confirm new password">
          <i class="fas fa-eye password-toggle input-icon" onclick="togglePassword('confirm-password', this)"></i>
          <div class="error-message" id="confirm-password-error"></div>
        </div>
        
        <button class="btn btn-primary" onclick="resetPassword()">Reset Password</button>
      </div>
      
      <div class="modal-footer">
        <a href="#" onclick="closeModal()">Back to Login</a>
      </div>
    </div>
  </div>

  <script src="js/auth.js"></script>
</body>
</html>