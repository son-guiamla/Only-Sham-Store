<?php
session_start();
require_once 'includes/auth_functions.php';

$error = '';
$username = '';

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    $admin_code = $_POST['admin_code'] ?? '';

    $result = login_user($username, $password, $admin_code);

    if ($result['success']) {
        // Redirect based on user role
        if ($result['is_admin']) {
            header("Location: admin-dashboard.php");
            exit;
        } else {
            header("Location: index.php");
            exit;
        }
    } else {
        $error = $result['error'];
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Login | Only@Sham</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"/>
    <style>
        :root {
            --primary-color: #6c5ce7;
            --secondary-color: #a29bfe;
            --accent-color: #fd79a8;
            --dark-color: #2d3436;
            --light-color: #f5f6fa;
            --success-color: #00b894;
            --warning-color: #fdcb6e;
            --danger-color: #e74c3c;
            --border-radius: 10px;
            --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            --transition: all 0.3s ease;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: var(--light-color);
            color: var(--dark-color);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            transition: var(--transition);
        }

        .login-container {
            background-color: #fff;
            padding: 30px;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            width: 100%;
            max-width: 450px;
            transition: var(--transition);
            animation: fadeIn 0.5s ease-in-out;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .login-header {
            text-align: center;
            margin-bottom: 30px;
        }

        .login-header h1 {
            color: var(--primary-color);
            font-size: 2.5rem;
            font-weight: 600;
            margin-bottom: 10px;
        }

        .login-header p {
            color: #777;
            font-size: 1rem;
        }

        .login-form {
            display: flex;
            flex-direction: column;
        }

        .form-group {
            margin-bottom: 20px;
            transition: var(--transition);
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: var(--dark-color);
            font-weight: 500;
            font-size: 1rem;
            transition: var(--transition);
        }

        .form-control {
            padding: 12px 15px;
            border: 2px solid #e0e0e0;
            border-radius: var(--border-radius);
            font-size: 1rem;
            transition: var(--transition);
            width: 100%;
            box-sizing: border-box;
        }

        .form-control:focus {
            border-color: var(--primary-color);
            outline: none;
            box-shadow: 0 0 5px rgba(108, 92, 231, 0.3);
        }

        .input-icon {
            position: relative;
        }

        .input-icon i {
            position: absolute;
            top: 50%;
            right: 15px;
            transform: translateY(-50%);
            color: #999;
            cursor: pointer;
            transition: var(--transition);
        }

        .input-icon i:hover {
            color: var(--primary-color);
        }

        .password-toggle {
            cursor: pointer;
        }

        .error-message {
            color: var(--danger-color);
            font-size: 0.9rem;
            margin-top: 8px;
            display: none;
            animation: fadeIn 0.3s ease-in-out;
        }

        .error-message.active {
            display: block;
        }


        .login-button {
            padding: 12px 15px;
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: var(--border-radius);
            font-size: 1.1rem;
            font-weight: 500;
            cursor: pointer;
            transition: var(--transition);
            width: 100%;
            display: block;
            margin-top: 10px;
        }

        .login-button:hover {
            background-color: var(--secondary-color);
            transform: translateY(-2px);
        }

        .login-button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
            opacity: 0.7;
            transform: none;
        }

        .admin-code-group {
            display: none;
            opacity: 0;
            height: 0;
            transition: var(--transition);
            overflow: hidden;
        }

        .admin-code-group.active {
            display: block;
            opacity: 1;
            height: auto;
        }

        .forgot-password {
            text-align: center;
            margin-top: 20px;
            font-size: 0.9rem;
        }

        .forgot-password a {
            color: var(--primary-color);
            text-decoration: none;
            transition: var(--transition);
        }

        .forgot-password a:hover {
            color: var(--accent-color);
            text-decoration: underline;
        }


        /* Modal Styles */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.5);
            transition: var(--transition);
        }

        .modal-content {
            background-color: #fff;
            margin: 10% auto;
            padding: 30px;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            width: 90%;
            max-width: 500px;
            position: relative;
            animation: fadeIn 0.3s ease-in-out;
        }


        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }

        .modal-header h2 {
            margin: 0;
            color: var(--primary-color);
            font-size: 1.8rem;
        }

        .close-modal {
            position: absolute;
            top: 10px;
            right: 10px;
            color: #aaa;
            font-size: 2rem;
            font-weight: bold;
            cursor: pointer;
            transition: var(--transition);
            border: none;
            background: none;
            padding: 0;
        }

        .close-modal:hover,
        .close-modal:focus {
            color: var(--danger-color);
            text-decoration: none;
        }


        #forgot-password-step1,
        #forgot-password-step2,
        #forgot-password-step3 {
            display: none;
        }

        #forgot-password-step1.active,
        #forgot-password-step2.active,
        #forgot-password-step3.active {
            display: block;
        }

        .modal-footer {
            text-align: right;
            margin-top: 20px;
        }

        .modal-footer button {
            padding: 10px 20px;
            border: none;
            border-radius: var(--border-radius);
            font-size: 1rem;
            cursor: pointer;
            transition: var(--transition);
        }
        .modal-footer button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
            opacity: 0.7;
        }

        .modal-footer button:first-child {
            margin-right: 10px;
            background-color: #e0e0e0;
            color: var(--dark-color);
        }

        .modal-footer button:first-child:hover {
            background-color: #ccc;
        }

        .modal-footer button:last-child {
            background-color: var(--primary-color);
            color: white;
        }

        .modal-footer button:last-child:hover {
            background-color: var(--secondary-color);
        }

        .resend-otp {
            font-size: 0.9rem;
            color: #555;
            margin-top: 15px;
            text-align: center;
        }

        .resend-otp a {
            color: var(--primary-color);
            text-decoration: none;
            transition: var(--transition);
        }

        .resend-otp a:hover {
            color: var(--accent-color);
            text-decoration: underline;
        }

        @media (max-width: 768px) {
            .login-container {
                padding: 20px;
                max-width: 95%;
            }

            .modal-content {
                width: 95%;
                margin: 5% auto;
                padding: 20px;
            }
        }

        @media (max-width: 480px) {
            .login-header h1 {
                font-size: 2.2rem;
            }

            .form-control {
                font-size: 0.95rem;
                padding: 10px 12px;
            }

            .login-button {
                font-size: 1rem;
            }

            .modal-header h2 {
                font-size: 1.6rem;
            }
             .close-modal {
                font-size: 1.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <h1>Only@Sham</h1>
            <p>Welcome back! Please log in to your account.</p>
        </div>
        <form id="login-form" class="login-form" method="POST">
            <div class="form-group">
                <label for="username">Username or Email</label>
                <input type="text" id="username" name="username" class="form-control" placeholder="Enter your username or email" value="<?php echo htmlspecialchars($username); ?>" required>
                <div class="error-message" id="username-error"></div>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <div class="input-icon">
                    <input type="password" id="password" name="password" class="form-control" placeholder="Enter your password" required>
                    <i class="fas fa-eye password-toggle" onclick="togglePassword('password', this)"></i>
                </div>
                <div class="error-message" id="password-error"></div>
            </div>
            <div class="form-group admin-code-group" id="admin-code-group">
                <label for="admin-code">Admin Code</label>
                <input type="text" id="admin-code" name="admin_code" class="form-control" placeholder="Enter admin code">
                <div class="error-message" id="admin-code-error"></div>
            </div>
            <button type="submit" class="login-button" id="login-button">Log In</button>
            <?php if (!empty($error)): ?>
                <div class="error-message active"><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>
            <div class="forgot-password">
                <a href="#" id="forgotPasswordModalLink">Forgot Password?</a>
            </div>
        </form>
    </div>

    <div id="forgotPasswordModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Forgot Password</h2>
                <button class="close-modal" id="closeModalBtn">&times;</button>
            </div>
            <div id="forgot-password-step1" class="modal-body active">
                <p>Enter your email address to receive a verification code.</p>
                <div class="form-group">
                    <label for="reset-email">Email Address</label>
                    <input type="email" id="reset-email" class="form-control" placeholder="Enter your email address">
                    <div class="error-message" id="reset-email-error"></div>
                </div>
                <button class="btn btn-primary" id="send-code-button" disabled>Send Code</button>
            </div>
            <div id="forgot-password-step2" class="modal-body">
                <p>Enter the verification code sent to your email.</p>
                <div class="form-group">
                    <label for="otp">Verification Code</label>
                    <input type="text" id="otp" class="form-control" placeholder="Enter verification code">
                    <div class="error-message" id="otp-error"></div>
                </div>
                <div class="resend-otp">
                    Didn't receive code? <a href="#" id="resend-otp-link">Resend</a>
                </div>
                <button class="btn btn-primary" id="verify-otp-button" disabled>Verify Code</button>
            </div>
            <div id="forgot-password-step3" class="modal-body">
                <p>Enter your new password.</p>
                <div class="form-group">
                    <label for="new-password">New Password</label>
                    <div class="input-icon">
                        <input type="password" id="new-password" class="form-control" placeholder="Enter new password">
                         <i class="fas fa-eye password-toggle input-icon" onclick="togglePassword('new-password', this)"></i>
                    </div>
                    <div class="error-message" id="new-password-error"></div>
                </div>
                <div class="form-group">
                    <label for="confirm-password">Confirm New Password</label>
                     <div class="input-icon">
                        <input type="password" id="confirm-password" class="form-control" placeholder="Confirm new password">
                        <i class="fas fa-eye password-toggle input-icon" onclick="togglePassword('confirm-password', this)"></i>
                    </div>
                    <div class="error-message" id="confirm-password-error"></div>
                </div>
                <button class="btn btn-primary" id="reset-password-button" disabled>Reset Password</button>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" id="cancel-reset-button">Cancel</button>
            </div>
        </div>
    </div>

    <script>
        /* ======================
           GENERAL UTILITY FUNCTIONS
           ====================== */

        /**
         * Toggles the visibility of an element.
         * @param {string} id - The ID of the element to toggle.
         */
        function toggleVisibility(id) {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = element.style.display === 'none' ? 'block' : 'none';
            }
        }

        /**
         * Displays an error message.
         * @param {string} id - The ID of the error message element.
         * @param {string} message - The error message to display.
         */
        function showError(id, message) {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = message;
                el.style.display = 'block'; // Make sure to set display style
            }
        }

        /**
         * Hides an error message.
         * @param {string} id - The ID of the error message element.
         */
        function hideError(id) {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'none';
                el.textContent = ''; // Clear message
            }
        }

        /**
         * Validates an email address.
         * @param {string} email - The email address to validate.
         * @returns {boolean} - True if the email is valid, false otherwise.
         */
        function validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email.toLowerCase());
        }

        /**
         * Validates a phone number (basic check).
         * @param {string} phone - The phone number to validate.
         * @returns {boolean} - True if the phone number is valid, false otherwise.
         */
        function validatePhone(phone) {
            return /^[0-9]{10,15}$/.test(phone);
        }

        /**
         * Validates a password.
         * @param {string} password - The password to validate.
         * @returns {boolean} - True if the password is valid, false otherwise.
         */
        function validatePassword(password) {
            return password.length >= 6;
        }

        /**
         * Toggles the password visibility.
         * @param {string} inputId - The ID of the password input field.
         * @param {HTMLElement} icon - The icon element.
         */
        function togglePassword(inputId, icon) {
            const input = document.getElementById(inputId);
            if (input && icon) {
                input.type = input.type === 'password' ? 'text' : 'password';
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            }
        }

        /* ======================
           AUTHENTICATION FUNCTIONS
           ====================== */
        let currentOTP = '';
        let resetPhone = '';
        let resetEmail = ''; // Added for email reset
        let currentUserToReset = null;

        /**
         * Function to handle the login process.
         */
        function login() {
            const usernameOrEmail = document.getElementById('username')?.value.trim();
            const password = document.getElementById('password')?.value.trim();
            const adminCode = document.getElementById('admin-code')?.value.trim();

            hideError('username-error');
            hideError('password-error');
            hideError('admin-code-error');

            let isValid = true;

            if (!usernameOrEmail) {
                showError('username-error', 'Username or email is required');
                isValid = false;
            }
            if (!password) {
                showError('password-error', 'Password is required');
                isValid = false;
            }
            if (usernameOrEmail.toLowerCase() === 'admin' && !adminCode) {
                showError('admin-code-error', 'Admin code is required');
                isValid = false;
            }

            if (!isValid) return;

            // Disable the login button to prevent multiple submissions
            const loginButton = document.getElementById('login-button');
            loginButton.disabled = true;
            loginButton.textContent = 'Logging in...';

            // Simulate an asynchronous login request (replace with actual fetch)
            // fetch('your-login-api.php', {  //  <- Replace with your actual login API endpoint
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/x-www-form-urlencoded',
            //     },
            //     body: `username=${encodeURIComponent(usernameOrEmail)}&password=${encodeURIComponent(password)}&admin_code=${encodeURIComponent(adminCode)}`,
            // })
            // .then(response => response.json())
            // .then(data => {
            //     loginButton.disabled = false;
            //     loginButton.textContent = 'Log In';
            //     if (data.success) {
            //         // Handle successful login
            //         if (data.is_admin) {
            //             window.location.href = 'admin-dashboard.php'; //  <-  Make sure this matches your actual admin page
            //         } else {
            //             window.location.href = 'index.php';  // <- Make sure this matches your actual user page
            //         }
            //     } else {
            //         // Handle login error
            //         showError('password-error', data.error || 'Invalid credentials');
            //     }
            // })
            // .catch(error => {
            //     loginButton.disabled = false;
            //     loginButton.textContent = 'Log In';
            //     console.error('Login error:', error);
            //     showError('password-error', 'An error occurred. Please try again.');
            // });

            // Simulate the login process
            setTimeout(() => {
                loginButton.disabled = false;
                loginButton.textContent = 'Log In';
                // Simulate a successful login for the 'admin' user with the correct admin code.
                if (usernameOrEmail.toLowerCase() === 'admin' && password === 'admin123' && adminCode === 'Rimuru123') {
                    // Store admin code in session (simulated)
                    sessionStorage.setItem('admin_code', adminCode);
                    // Simulate setting the loggedInAdmin
                    localStorage.setItem('loggedInAdmin', JSON.stringify({ username: 'admin' }));
                    window.location.href = 'admin-dashboard.php';
                } else if (usernameOrEmail && password) {
                    // Simulate a successful login
                    localStorage.setItem('loggedInUser', JSON.stringify({ username: usernameOrEmail }));
                    window.location.href = 'index.php';
                } else {
                    showError('password-error', 'Invalid username/email or password.');
                }
            }, 1000);
        }

        // Attach event listener to the login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            login();
        });


        /* ======================
           FORGOT PASSWORD FUNCTIONS
           ====================== */

        const forgotPasswordModal = document.getElementById('forgotPasswordModal');
        const forgotPasswordModalLink = document.getElementById('forgotPasswordModalLink');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const cancelResetButton = document.getElementById('cancel-reset-button');


        const step1 = document.getElementById('forgot-password-step1');
        const step2 = document.getElementById('forgot-password-step2');
        const step3 = document.getElementById('forgot-password-step3');

        const sendCodeButton = document.getElementById('send-code-button');
        const verifyOtpButton = document.getElementById('verify-otp-button');
        const resetPasswordButton = document.getElementById('reset-password-button');
        const resendOtpLink = document.getElementById('resend-otp-link');


        let currentStep = 1;

        function showStep(stepNum) {
            currentStep = stepNum;
            step1.classList.remove('active');
            step2.classList.remove('active');
            step3.classList.remove('active');

            switch (stepNum) {
                case 1:
                    step1.classList.add('active');
                    break;
                case 2:
                    step2.classList.add('active');
                    break;
                case 3:
                    step3.classList.add('active');
                    break;
            }
        }

        function openModal() {
            forgotPasswordModal.style.display = 'block';
            showStep(1); // Start with step 1
            resetEmail = '';
            currentOTP = '';
            resetPhone = '';
            currentUserToReset = null;
            // Clear all input fields and error messages
            document.getElementById('reset-email').value = '';
            document.getElementById('otp').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
            hideError('reset-email-error');
            hideError('otp-error');
            hideError('new-password-error');
            hideError('confirm-password-error');

            sendCodeButton.disabled = true;
            verifyOtpButton.disabled = true;
            resetPasswordButton.disabled = true;
        }

        function closeModal() {
            forgotPasswordModal.style.display = 'none';
        }



        forgotPasswordModalLink.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });

        closeModalBtn.addEventListener('click', closeModal);
        cancelResetButton.addEventListener('click', closeModal);

        window.addEventListener('click', (e) => {
            if (e.target === forgotPasswordModal) {
                closeModal();
            }
        });

        const resetEmailInput = document.getElementById('reset-email');
        if (resetEmailInput) {
            resetEmailInput.addEventListener('input', () => {
                const email = resetEmailInput.value.trim();
                sendCodeButton.disabled = !validateEmail(email);
                hideError('reset-email-error');
            });
        }

        const otpInput = document.getElementById('otp');
        if (otpInput) {
            otpInput.addEventListener('input', () => {
                const otpValue = otpInput.value.trim();
                verifyOtpButton.disabled = !otpValue;
                hideError('otp-error');
            });
        }

        const newPasswordInput = document.getElementById('new-password');
        const confirmPasswordInput = document.getElementById('confirm-password');

        if (newPasswordInput && confirmPasswordInput) {
            newPasswordInput.addEventListener('input', () => {
                const newPassword = newPasswordInput.value.trim();
                const confirmPassword = confirmPasswordInput.value.trim();
                resetPasswordButton.disabled = !(validatePassword(newPassword) && newPassword === confirmPassword);
                hideError('new-password-error');
                hideError('confirm-password-error');
            });

            confirmPasswordInput.addEventListener('input', () => {
                const newPassword = newPasswordInput.value.trim();
                const confirmPassword = confirmPasswordInput.value.trim();
                resetPasswordButton.disabled = !(validatePassword(newPassword) && newPassword === confirmPassword);
                hideError('new-password-error');
                hideError('confirm-password-error');
            });
        }


        sendCodeButton.addEventListener('click', () => {
            const email = document.getElementById('reset-email').value.trim();
            if (!validateEmail(email)) {
                showError('reset-email-error', 'Please enter a valid email address.');
                return;
            }

            // Simulate sending a verification code
            // Replace this with your actual code sending mechanism (e.g., API call)
            resetEmail = email; // Store for later steps
            currentOTP = Math.floor(Math.random() * 1000000).toString().padStart(6, '0'); // Generate a 6-digit OTP
            console.log(`Generated OTP for ${email}: ${currentOTP}`); // For debugging
            // In a real application, you would send the OTP via email

            // Simulate success and proceed to the next step after a short delay
            setTimeout(() => {
                showStep(2);
            }, 1000);
        });



        verifyOtpButton.addEventListener('click', () => {
            const enteredOTP = document.getElementById('otp').value.trim();
            if (enteredOTP !== currentOTP) {
                showError('otp-error', 'Invalid verification code.');
                return;
            }

            // Simulate success and proceed to the next step
            setTimeout(() => {
                showStep(3);
            }, 500);
        });

        resendOtpLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (!resetEmail) {
                showError('otp-error', 'Email not available. Please restart the process.');
                return;
            }
            // Resend the OTP (in a real app, you'd call your backend again)
            currentOTP = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
            console.log(`Resending OTP for ${resetEmail}: ${currentOTP}`);
            // Optionally re-enable the Send Code button
            sendCodeButton.disabled = false;
            hideError('otp-error');
            document.getElementById('otp').value = '';
        });


        resetPasswordButton.addEventListener('click', () => {
            const newPassword = document.getElementById('new-password').value.trim();
            const confirmPassword = document.getElementById('confirm-password').value.trim();

            if (!validatePassword(newPassword)) {
                showError('new-password-error', 'Password must be at least 6 characters long.');
                return;
            }
            if (newPassword !== confirmPassword) {
                showError('confirm-password-error', 'Passwords do not match.');
                return;
            }

            // Simulate password reset
            // Replace this with your actual password reset logic (e.g., API call)
            console.log(`Resetting password for ${resetEmail} to ${newPassword}`);
            // In a real application, you would send the new password to the server

            setTimeout(() => {
                closeModal();
                // Optionally show a success message to the user
                alert('Password reset successfully. Please log in with your new password.');
                // Redirect to login page
                window.location.href = 'login.php';
            }, 1000);
        });

        // Initial setup:  Hide admin code group
        const adminCodeGroup = document.getElementById('admin-code-group');
        if (adminCodeGroup) {
            adminCodeGroup.style.display = 'none';
        }

        // Event listener for username input to show/hide admin code field
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.addEventListener('input', function () {
                const adminCodeGroup = document.getElementById('admin-code-group');
                if (adminCodeGroup) {
                    adminCodeGroup.style.display = this.value.trim().toLowerCase() === 'admin' ? 'block' : 'none';
                }
            });
        }
    </script>
</body>
</html>
