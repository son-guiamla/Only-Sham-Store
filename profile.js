document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in (via session)
    checkLoginStatus();

    // Load user data
    loadUserProfile();
    loadReservations();
    setupLoginLogout();

    // Profile picture upload
    const profileUpload = document.getElementById('profile-upload');
    const profilePicture = document.getElementById('profile-picture');
    const removePictureBtn = document.getElementById('remove-picture-btn');

    if (profileUpload) {
        profileUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    profilePicture.src = event.target.result;
                    updateProfilePicture(file); // Pass the file object instead of data URL
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (removePictureBtn) {
        removePictureBtn.addEventListener('click', function() {
            profilePicture.src = 'assets/default-profile.png';
            updateProfilePicture('default');
        });
    }

    // Profile menu navigation
    const menuButtons = document.querySelectorAll('.profile-menu-btn');
    menuButtons.forEach(button => {
        button.addEventListener('click', function() {
            menuButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            const sectionId = this.getAttribute('data-section') + '-section';
            document.querySelectorAll('.profile-section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(sectionId).classList.add('active');
        });
    });

    // Personal info form submission
    const personalInfoForm = document.getElementById('personal-info-form');
    if (personalInfoForm) {
        personalInfoForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updatePersonalInfo();
        });
    }

    // Security form submission
    const securityForm = document.getElementById('security-form');
    if (securityForm) {
        securityForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updatePassword();
        });
    }
});

function checkLoginStatus() {
    fetch('includes/profile.php?action=check_login')
    .then(response => response.json())
    .then(data => {
        if (!data.loggedIn) {
            alert('Please login to access your profile');
            window.location.href = 'login.php';
        }
    })
    .catch(error => {
        console.error('Error checking login status:', error);
    });
}

function loadUserProfile() {
    fetch('includes/profile.php?action=get_profile_data')
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const user = data.user;
            
            // Load profile picture
            const profilePicture = document.getElementById('profile-picture');
            if (profilePicture) {
                profilePicture.src = user.profile_picture || 'assets/default-profile.png';
            }

            // Load personal info
            if (document.getElementById('full-name')) {
                document.getElementById('full-name').value = user.fullname || '';
                document.getElementById('username').value = user.username || '';
                document.getElementById('email').value = user.email || '';
                document.getElementById('phone').value = user.phone || '';
                document.getElementById('gender').value = user.gender || '';
            }
            
            updateProfileIcon();
        }
    })
    .catch(error => {
        console.error('Error loading user profile:', error);
    });
}

function updateProfilePicture(imageData) {
    const formData = new FormData();
    formData.append('action', 'update_profile_picture');
    
    if (imageData === 'default') {
        formData.append('default_image', '1');
    } else if (imageData instanceof File) {
        formData.append('image', imageData);
    } else {
        console.error('Invalid image data');
        return;
    }

    fetch('includes/profile.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateProfileIcon();
            alert('Profile picture updated successfully!');
        } else {
            alert(data.error || 'Error updating profile picture');
        }
    })
    .catch(error => {
        console.error('Error updating profile picture:', error);
        alert('Error updating profile picture');
    });
}

function updateProfileIcon() {
    const profileIcons = document.querySelectorAll('.profile-icon');
    
    fetch('includes/profile.php?action=get_profile_picture')
    .then(response => response.json())
    .then(data => {
        profileIcons.forEach(icon => {
            if (data.success && data.image && data.image !== 'assets/default-profile.png') {
                icon.innerHTML = `<img src="${data.image}" alt="Profile" class="profile-icon-img">`;
                const img = icon.querySelector('.profile-icon-img');
                if (img) {
                    img.style.width = '24px';
                    img.style.height = '24px';
                    img.style.borderRadius = '50%';
                    img.style.objectFit = 'cover';
                }
            } else {
                icon.innerHTML = '<i class="fas fa-user"></i>';
            }
        });
    })
    .catch(error => {
        console.error('Error updating profile icon:', error);
    });
}

function updatePersonalInfo() {
    const formData = new FormData();
    formData.append('action', 'update_personal_info');
    formData.append('full-name', document.getElementById('full-name').value);
    formData.append('username', document.getElementById('username').value);
    formData.append('email', document.getElementById('email').value);
    formData.append('phone', document.getElementById('phone').value);
    formData.append('gender', document.getElementById('gender').value);

    fetch('includes/profile.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Personal information updated successfully!');
            loadUserProfile(); // Refresh the data
        } else {
            alert(data.error || 'Error updating personal information');
        }
    })
    .catch(error => {
        console.error('Error updating personal info:', error);
        alert('Error updating personal information');
    });
}

function updatePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        alert('New passwords do not match!');
        return;
    }

    const formData = new FormData();
    formData.append('action', 'update_password');
    formData.append('current-password', currentPassword);
    formData.append('new-password', newPassword);
    formData.append('confirm-password', confirmPassword);

    fetch('includes/profile.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Password updated successfully!');
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
        } else {
            alert(data.error || 'Error updating password');
        }
    })
    .catch(error => {
        console.error('Error updating password:', error);
        alert('Error updating password');
    });
}

function loadReservations() {
    fetch('includes/profile.php?action=get_reservations')
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderReservations(data.reservations);
        } else {
            document.getElementById('reservations-list').innerHTML = 
                '<p class="empty-message">You have no active reservations.</p>';
        }
    })
    .catch(error => {
        console.error('Error loading reservations:', error);
        document.getElementById('reservations-list').innerHTML = 
            '<p class="empty-message">Error loading reservations.</p>';
    });
}

function renderReservations(reservations) {
    const reservationsContainer = document.getElementById('reservations-list');
    if (!reservationsContainer) return;
    
    let html = '';
    let totalSpent = 0;

    // Active reservations
    if (reservations.active && reservations.active.length > 0) {
        html += '<div class="reservation-section"><h3>Active Reservations</h3>';
        
        reservations.active.forEach((item, index) => {
            let status, statusClass;
            if (item.status === 'confirmed') {
                status = 'confirmed';
                statusClass = 'status-confirmed';
            } else {
                status = 'reserved';
                statusClass = 'status-reserved';
                
                if (item.reserved_at) {
                    const expiryDate = new Date(item.reserved_at);
                    expiryDate.setDate(expiryDate.getDate() + 3);
                    
                    if (new Date() > expiryDate) {
                        status = 'expired';
                        statusClass = 'status-expired';
                    }
                }
            }
            
            html += `
            <div class="reservation-item">
                <img src="${item.image || 'assets/default-product.jpg'}" alt="${item.name}">
                <div class="reservation-details">
                    <h4>${item.name}</h4>
                    <p>Size: ${item.size} | Qty: ${item.quantity}</p>
                    <p>Price: ₱${parseFloat(item.price).toFixed(2)} each</p>
                    <p>Total: ₱${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}</p>
                    <span class="status ${statusClass}">${status}</span>
                    ${item.reserved_at ? `<p>Reserved: ${new Date(item.reserved_at).toLocaleDateString()}</p>` : ''}
                </div>
                ${status === 'reserved' ? `
                <div class="reservation-actions">
                    <button class="btn-cancel" data-id="${item.id}">Cancel</button>
                </div>` : ''}
            </div>
            `;
            
            if (status === 'confirmed') {
                totalSpent += parseFloat(item.price) * parseInt(item.quantity);
            }
        });
        
        html += '</div>';
    }

    // Picked items history
    if (reservations.picked && reservations.picked.length > 0) {
        html += '<div class="reservation-section"><h3>Order History</h3>';
        
        reservations.picked.forEach((item, index) => {
            html += `
            <div class="reservation-item picked">
                <img src="${item.image || 'assets/default-product.jpg'}" alt="${item.name}">
                <div class="reservation-details">
                    <h4>${item.name}</h4>
                    <p>Size: ${item.size} | Qty: ${item.quantity}</p>
                    <p>Price: ₱${parseFloat(item.price).toFixed(2)} each</p>
                    <p>Total: ₱${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}</p>
                    <span class="status status-completed">Picked Up</span>
                    <p>Picked on: ${new Date(item.picked_at).toLocaleDateString()}</p>
                </div>
                <div class="reservation-actions">
                    <button class="btn-delete" data-id="${item.id}" data-type="picked">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
            `;
            
            totalSpent += parseFloat(item.price) * parseInt(item.quantity);
        });
        
        html += '</div>';
    }

    if (totalSpent > 0) {
        html += `<div class="total-spending">Total Cost: ₱${totalSpent.toFixed(2)}</div>`;
    }

    reservationsContainer.innerHTML = html || '<p class="empty-message">You have no active reservations.</p>';
    
    // Add event listeners to cancel buttons
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', function() {
            cancelReservation(parseInt(this.dataset.id), false);
        });
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function() {
            cancelReservation(parseInt(this.dataset.id), true);
        });
    });
}

function cancelReservation(reservationId, isPickedItem = false) {
    if (!confirm('Are you sure you want to ' + (isPickedItem ? 'delete' : 'cancel') + ' this item?')) return;

    const formData = new FormData();
    formData.append('action', 'cancel_reservation');
    formData.append('reservation_id', reservationId);
    formData.append('is_picked', isPickedItem);

    fetch('includes/profile.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadReservations();
        } else {
            alert(data.error || 'Error canceling reservation');
        }
    })
    .catch(error => {
        console.error('Error canceling reservation:', error);
        alert('Error canceling reservation');
    });
}

function setupLoginLogout() {
    const loginLink = document.getElementById('login-logout-link');
    if (!loginLink) return;
    
    fetch('includes/profile.php?action=check_login')
    .then(response => response.json())
    .then(data => {
        if (data.loggedIn) {
            loginLink.textContent = 'Logout';
            loginLink.href = 'logout.php';
        } else {
            loginLink.textContent = 'Login';
            loginLink.href = 'login.php';
        }
    })
    .catch(error => {
        console.error('Error setting up login/logout:', error);
    });
}