function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.style.right = sidebar.style.right === '0px' ? '-250px' : '0px';
    }
}

function checkAdminExists() {
    fetch('includes/auth.php?action=check_admin_exists')
    .then(response => response.json())
    .then(data => {
        if (data.exists) {
            const adminSignupLink = document.getElementById('admin-signup-link');
            if (adminSignupLink) {
                adminSignupLink.style.display = 'none';
            }
        }
    })
    .catch(error => {
        console.error('Error checking admin status:', error);
    });
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

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
}

function validatePhone(phone) {
    return /^[0-9]{10,15}$/.test(phone);
}

function validatePassword(password) {
    return password.length >= 6;
}

function switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    const tabElement = document.querySelector(`.auth-tab:nth-child(${tab === 'login' ? 1 : 2})`);
    const formElement = document.getElementById(`${tab}-form`);
    
    if (tabElement) tabElement.classList.add('active');
    if (formElement) formElement.classList.add('active');
}

function togglePassword(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input && icon) {
        input.type = input.type === 'password' ? 'text' : 'password';
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    }
}

function login() {
    const usernameOrEmail = document.getElementById('login-username')?.value.trim();
    const password = document.getElementById('login-password')?.value.trim();
    const adminCode = document.getElementById('admin-code')?.value.trim();

    hideError('login-username-error');
    hideError('login-password-error');
    hideError('admin-code-error');

    let valid = true;
    if (!usernameOrEmail) { 
        showError('login-username-error', 'Username or email is required'); 
        valid = false; 
    }
    if (!password) {
        showError('login-password-error', 'Password is required'); 
        valid = false;
    }
    if (!valid) return;

    const data = {
        action: 'login',
        username: usernameOrEmail,
        password: password,
        is_admin: usernameOrEmail.toLowerCase() === 'admin'
    };

    if (adminCode) {
        data.admin_code = adminCode;
    }

    fetch('includes/auth.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const loginSuccess = document.getElementById('login-success');
            if (loginSuccess) {
                loginSuccess.textContent = 'Login successful! Redirecting...';
                loginSuccess.style.display = 'block';
            }
            window.location.href = data.redirect || 'index.php';
        } else {
            if (data.error === 'Your account is banned. Please contact support.') {
                showError('login-username-error', data.error);
            } else if (data.error === 'User not found') {
                showError('login-username-error', 'User not found');
            } else {
                showError('login-password-error', data.error || 'Invalid credentials');
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('login-password-error', 'An error occurred during login');
    });
}

function signup() {
    const fullname = document.getElementById('signup-fullname')?.value.trim();
    const phone = document.getElementById('signup-phone')?.value.trim();
    const email = document.getElementById('signup-email')?.value.trim();
    const username = document.getElementById('signup-username')?.value.trim();
    const password = document.getElementById('signup-password')?.value.trim();
    const address = document.getElementById('signup-address')?.value.trim();

    hideError('signup-fullname-error');
    hideError('signup-phone-error');
    hideError('signup-email-error');
    hideError('signup-username-error');
    hideError('signup-password-error');
    hideError('signup-address-error');

    let valid = true;
    if (!fullname) { 
        showError('signup-fullname-error', 'Full name is required'); 
        valid = false; 
    }
    if (!phone || !validatePhone(phone)) { 
        showError('signup-phone-error', 'Valid phone number (10-15 digits) is required'); 
        valid = false; 
    }
    if (!email || !validateEmail(email)) { 
        showError('signup-email-error', 'Valid email is required'); 
        valid = false; 
    }
    if (!username) { 
        showError('signup-username-error', 'Username is required'); 
        valid = false; 
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showError('signup-username-error', 'Username can only contain letters, numbers and underscores');
        valid = false;
    }
    if (!password || !validatePassword(password)) { 
        showError('signup-password-error', 'Password must be at least 6 characters'); 
        valid = false; 
    }
    if (!valid) return;

    fetch('includes/auth.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'signup',
            fullname,
            phone,
            email,
            username,
            password,
            address
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.textContent = 'Registration successful! Redirecting...';
            document.body.appendChild(successMessage);
            
            setTimeout(() => {
                window.location.href = data.redirect || 'index.php';
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

function showForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    document.getElementById('forgot-password-step1').style.display = 'block';
    document.getElementById('forgot-password-step2').style.display = 'none';
    document.getElementById('forgot-password-step3').style.display = 'none';
    
    const phoneInput = document.getElementById('forgot-phone');
    if (phoneInput) phoneInput.value = '';
    
    hideError('forgot-phone-error');
    hideError('otp-error');
}

function closeModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.style.display = 'none';
}

function sendOTP() {
    const phone = document.getElementById('forgot-phone')?.value.trim();
    hideError('forgot-phone-error');

    if (!phone || !validatePhone(phone)) {
        return showError('forgot-phone-error', 'Please enter a valid phone number (10-15 digits)');
    }

    fetch('includes/auth.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'send_otp',
            phone: phone
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const step1 = document.getElementById('forgot-password-step1');
            const step2 = document.getElementById('forgot-password-step2');
            if (step1) step1.style.display = 'none';
            if (step2) step2.style.display = 'block';
            
            const phoneMask = document.getElementById('phone-mask');
            if (phoneMask) {
                const maskedPhone = phone.substring(0, 3) + '****' + phone.substring(7);
                phoneMask.textContent = maskedPhone;
            }
            
            const firstOtpInput = document.querySelector('.otp-input');
            if (firstOtpInput) firstOtpInput.focus();
            setupOTPInputs();
        } else {
            showError('forgot-phone-error', data.error || 'Error sending OTP');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('forgot-phone-error', 'Error sending OTP. Please try again.');
    });
}

function setupOTPInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach(input => {
        input.value = '';
        input.addEventListener('input', function(e) {
            if (this.value.length === 1) {
                const nextIndex = parseInt(this.dataset.index) + 1;
                const nextInput = document.querySelector(`.otp-input[data-index="${nextIndex}"]`);
                if (nextInput) nextInput.focus();
            }
        });
        
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value.length === 0) {
                const prevIndex = parseInt(this.dataset.index) - 1;
                const prevInput = document.querySelector(`.otp-input[data-index="${prevIndex}"]`);
                if (prevInput) prevInput.focus();
            }
        });
    });
}

function verifyOTP() {
    const otpInputs = document.querySelectorAll('.otp-input');
    let enteredOTP = '';
    
    otpInputs.forEach(input => {
        enteredOTP += input.value;
    });
    
    hideError('otp-error');
    
    if (enteredOTP.length !== 6) {
        return showError('otp-error', 'Please enter the full 6-digit OTP');
    }

    const phone = document.getElementById('forgot-phone')?.value.trim();
    
    fetch('includes/auth.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'verify_otp',
            phone: phone,
            otp: enteredOTP
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const step2 = document.getElementById('forgot-password-step2');
            const step3 = document.getElementById('forgot-password-step3');
            if (step2) step2.style.display = 'none';
            if (step3) step3.style.display = 'block';
        } else {
            showError('otp-error', data.error || 'Invalid OTP. Please try again');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('otp-error', 'Error verifying OTP. Please try again.');
    });
}

function resendOTP() {
    const phone = document.getElementById('forgot-phone')?.value.trim();
    
    fetch('includes/auth.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'resend_otp',
            phone: phone
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const otpInputs = document.querySelectorAll('.otp-input');
            otpInputs.forEach(input => input.value = '');
            if (otpInputs[0]) otpInputs[0].focus();
            
            hideError('otp-error');
            alert('New OTP sent successfully!');
        } else {
            showError('otp-error', data.error || 'Error resending OTP');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('otp-error', 'Error resending OTP. Please try again.');
    });
}

function resetPassword() {
    const newPassword = document.getElementById('new-password')?.value.trim();
    const confirmPassword = document.getElementById('confirm-password')?.value.trim();
    const phone = document.getElementById('forgot-phone')?.value.trim();
    
    hideError('new-password-error');
    hideError('confirm-password-error');
    
    if (!newPassword || !validatePassword(newPassword)) {
        return showError('new-password-error', 'Password must be at least 6 characters');
    }
    
    if (newPassword !== confirmPassword) {
        return showError('confirm-password-error', 'Passwords do not match');
    }
    
    fetch('includes/auth.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'reset_password',
            phone: phone,
            new_password: newPassword
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Password reset successfully! You can now login with your new password.');
            closeModal();
        } else {
            showError('confirm-password-error', data.error || 'Error resetting password');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('confirm-password-error', 'Error resetting password. Please try again.');
    });
}

function logout() {
    fetch('includes/auth.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'action=logout'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = data.redirect || 'login.php';
        } else {
            window.location.href = 'login.php';
        }
    })
    .catch(error => {
        console.error('Logout error:', error);
        window.location.href = 'login.php';
    });
}

function checkLoginState() {
    const loginLinks = document.querySelectorAll('#login-logout-link');
    
    fetch('includes/auth.php?action=check_login')
    .then(response => response.json())
    .then(data => {
        loginLinks.forEach(link => {
            if (link) {
                if (data.loggedIn) {
                    link.textContent = 'Logout';
                    link.href = '#';
                    link.onclick = function(e) {
                        e.preventDefault();
                        logout();
                    };
                } else {
                    link.textContent = 'Login';
                    link.href = 'login.php';
                    link.onclick = null;
                }
            }
        });

        if (!data.loggedIn) {
            document.querySelectorAll('.add-to-cart').forEach(button => {
                button.disabled = true;
            });
        } else {
            document.querySelectorAll('.add-to-cart').forEach(button => {
                button.disabled = false;
            });
        }
    })
    .catch(error => {
        console.error('Error checking login state:', error);
        loginLinks.forEach(link => {
            if (link) {
                link.textContent = 'Login';
                link.href = 'login.php';
                link.onclick = null;
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    checkLoginState();
    
    if (window.location.pathname.includes('login.php')) {
        const adminCodeGroup = document.getElementById('admin-code-group');
        if (adminCodeGroup) adminCodeGroup.style.display = 'none';
        
        const loginUsernameInput = document.getElementById('login-username');
        if (loginUsernameInput) {
            loginUsernameInput.addEventListener('input', function() {
                if (adminCodeGroup) {
                    adminCodeGroup.style.display = this.value.trim().toLowerCase() === 'admin' ? 'block' : 'none';
                }
            });
        }
    }
    
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            login();
        });
    }
    
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            signup();
        });
    }
    
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            showForgotPasswordModal();
        });
    }
});