// DOM Elements
const profileForm = document.getElementById('profileForm');
const profilePicPreview = document.getElementById('profilePicPreview');
const profilePicUpload = document.getElementById('profilePicUpload');
const fullNameInput = document.getElementById('fullName');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const addressInput = document.getElementById('address');
const logoutBtn = document.querySelector('.logout-btn');

// Initialize profile page
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    if (!localStorage.getItem('username')) {
        window.location.href = 'auth.html';
        return;
    }
    
    // Load user data
    loadUserProfile();
    
    // Event listeners
    profilePicUpload.addEventListener('change', handleProfilePicUpload);
    profileForm.addEventListener('submit', handleProfileUpdate);
    logoutBtn.addEventListener('click', handleLogout);
});

// Load user profile data
function loadUserProfile() {
    fetch('profile.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayUserProfile(data.user);
            } else {
                console.error('Failed to load profile:', data.message);
            }
        })
        .catch(error => {
            console.error('Error loading profile:', error);
        });
}

// Display user profile data
function displayUserProfile(user) {
    fullNameInput.value = user.full_name || '';
    usernameInput.value = user.username || '';
    emailInput.value = user.email || '';
    phoneInput.value = user.phone || '';
    addressInput.value = user.address || '';
    
    if (user.profile_pic) {
        profilePicPreview.src = user.profile_pic;
    }
}

// Handle profile picture upload
function handleProfilePicUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
        alert('Please select an image file');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        profilePicPreview.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Handle profile update
function handleProfileUpdate(e) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('full_name', fullNameInput.value);
    formData.append('phone', phoneInput.value);
    formData.append('address', addressInput.value);
    
    if (profilePicUpload.files.length > 0) {
        formData.append('profile_pic', profilePicUpload.files[0]);
    }
    
    // Show loading state
    const submitBtn = profileForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    // Send request to server
    fetch('profile.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Profile updated successfully');
        } else {
            alert(data.message || 'Failed to update profile');
        }
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    });
}

// Handle logout
function handleLogout() {
    fetch('auth.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'action=logout'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            localStorage.removeItem('username');
            localStorage.removeItem('is_admin');
            window.location.href = 'auth.html';
        } else {
            alert('Logout failed');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}