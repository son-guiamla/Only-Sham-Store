import { USERS_ENDPOINT } from './config.js';
import { checkUserBanStatus, setupLoginLogout, getAuthToken } from './auth.js';

document.addEventListener('DOMContentLoaded', async function() {
    if (!await checkUserBanStatus()) return;
    
    try {
        await loadUserProfile();
        setupLoginLogout();
        setupProfilePictureUpload();
    } catch (error) {
        console.error('Profile initialization error:', error);
        alert(error.message);
    }
});

async function loadUserProfile() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!loggedInUser) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const response = await fetch(`${USERS_ENDPOINT}${loggedInUser.username}`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        const userData = await response.json();
        
        // Update form fields
        document.getElementById('full-name').value = userData.fullname || '';
        document.getElementById('username').value = userData.username || '';
        document.getElementById('email').value = userData.email || '';
        document.getElementById('phone').value = userData.phone || '';
        document.getElementById('gender').value = userData.gender || '';
        
        // Update profile picture
        const profileImg = document.getElementById('profile-picture');
        if (profileImg) {
            profileImg.src = userData.profilePicture || 'assets/default-profile.png';
            profileImg.onerror = () => {
                profileImg.src = 'assets/default-profile.png';
            };
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        throw error;
    }
}

function setupProfilePictureUpload() {
    const uploadInput = document.getElementById('profile-picture-upload');
    const profileImg = document.getElementById('profile-picture');
    
    if (!uploadInput || !profileImg) return;
    
    uploadInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.match('image.*')) {
            alert('Please select an image file');
            return;
        }
        
        if (file.size > 2 * 1024 * 1024) {
            alert('Image must be less than 2MB');
            return;
        }
        
        const formData = new FormData();
        formData.append('profilePicture', file);
        
        try {
            const response = await fetch(`${USERS_ENDPOINT}profile-picture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message);
            }
            
            const { profilePicture } = await response.json();
            profileImg.src = profilePicture;
            
            // Update local user data
            const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
            loggedInUser.profilePicture = profilePicture;
            localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
            
            alert('Profile picture updated successfully!');
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            alert(error.message);
        }
    });
}

window.updatePersonalInfo = async function() {
    const formData = {
        fullname: document.getElementById('full-name').value.trim(),
        username: document.getElementById('username').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        gender: document.getElementById('gender').value
    };
    
    if (!formData.fullname || !formData.email) {
        alert('Full name and email are required');
        return;
    }
    
    try {
        const response = await fetch(`${USERS_ENDPOINT}update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        const updatedUser = await response.json();
        
        // Update local storage
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        Object.assign(loggedInUser, updatedUser);
        localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
        
        alert('Profile updated successfully!');
    } catch (error) {
        console.error('Error updating profile:', error);
        alert(error.message);
    }
};

window.updatePassword = async function() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('All password fields are required');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }
    
    if (newPassword.length < 8) {
        alert('Password must be at least 8 characters');
        return;
    }
    
    try {
        const response = await fetch(`${USERS_ENDPOINT}password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        // Clear password fields
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        
        alert('Password updated successfully!');
    } catch (error) {
        console.error('Error updating password:', error);
        alert(error.message);
    }
};