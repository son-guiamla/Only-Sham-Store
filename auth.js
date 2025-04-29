// Initialize admin user on script load
initializeAdminUser();

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.style.right = sidebar.style.right === '0px' ? '-250px' : '0px';
}

// Add to signup form validation
if (!email) {
    showError('signup-email-error', 'Email is required');
    isValid = false;
} else if (!validateEmail(email)) {
    showError('signup-email-error', 'Please enter a valid email');
    isValid = false;
}

// In auth.js signup function
const address = document.getElementById('signup-address').value.trim();
// Include in newUser object
// Update the new user object
const newUser = {
    fullname,
    phone,
    email,
    username,
    password,
    address,
    reservations: []
};

function registerUser(fullname, username, email, phone, password, gender = '') {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    if (users.some(user => user.username === username)) {
        alert('Username already exists');
        return false;
    }
    
    if (users.some(user => user.email === email)) {
        alert('Email already registered');
        return false;
    }
    
    const newUser = {
        fullname,
        username,
        email,
        phone,
        password,
        gender,
        profilePicture: '',
        reservations: []
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    return true;
}

// Add this function to auth.js
function checkUserBanStatus() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (loggedInUser) {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const currentUser = users.find(u => u.username === loggedInUser.username);
        
        if (currentUser?.banned) {
            localStorage.removeItem('loggedInUser');
            window.location.href = 'login.html?banned=true';
            return false;
        }
    }
    return true;
}

// Add this to the top of profile.js, cart.js, and other protected pages
document.addEventListener('DOMContentLoaded', function() {
    if (!checkUserBanStatus()) return;
    // Rest of your existing code
});

function setupLoginLogout() {
    try {
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        const loginLink = document.getElementById('login-logout-link');
        
        if (!loginLink) return;
        
        if (loggedInUser) {
            loginLink.textContent = 'Logout';
            loginLink.href = 'login.html';
            loginLink.onclick = function(e) {
                e.preventDefault();
                localStorage.removeItem('loggedInUser');
                window.location.href = 'index.html';
            };
        } else {
            loginLink.textContent = 'Login';
            loginLink.href = 'login.html';
            loginLink.onclick = null;
        }
    } catch (error) {
        console.error('Error setting up login/logout:', error);
    }
}

function initializeAdminUser() {
    const admins = JSON.parse(localStorage.getItem('adminUsers')) || [];
    if (!admins.some(u => u.username === 'admin')) {
        admins.push({
            username: "admin",
            password: "admin123",
            adminCode: "Rimuru123",
            fullname: "System Administrator",
            email: "admin@onlyatsham.com",
            phone: "1234567890",
            is_admin: true
        });
        localStorage.setItem('adminUsers', JSON.stringify(admins));
        console.log('Admin user initialized');
    }
}