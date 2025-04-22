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