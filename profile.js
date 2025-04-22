document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!loggedInUser) {
        alert('Please login to access your profile');
        window.location.href = 'login.html';
        return;
    }

    // Load user data
    loadUserProfile();
    loadReservations();

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
                    saveProfilePicture(event.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (removePictureBtn) {
        removePictureBtn.addEventListener('click', function() {
            profilePicture.src = 'assets/default-profile.png';
            removeProfilePicture();
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

function loadUserProfile() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.username === loggedInUser.username);

    if (user) {
        // Load profile picture
        const profilePicture = document.getElementById('profile-picture');
        if (profilePicture) {
            profilePicture.src = user.profilePicture || 'assets/default-profile.png';
        }

        // Load personal info
        if (document.getElementById('full-name')) {
            document.getElementById('full-name').value = user.fullname || '';
        }
        if (document.getElementById('username')) {
            document.getElementById('username').value = user.username || '';
        }
        if (document.getElementById('email')) {
            document.getElementById('email').value = user.email || '';
        }
        if (document.getElementById('phone')) {
            document.getElementById('phone').value = user.phone || '';
        }
        if (document.getElementById('gender')) {
            document.getElementById('gender').value = user.gender || '';
        }
    }
}

function saveProfilePicture(imageData) {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.username === loggedInUser.username);

    if (userIndex !== -1) {
        users[userIndex].profilePicture = imageData;
        localStorage.setItem('users', JSON.stringify(users));
        
        // Update loggedInUser in localStorage
        loggedInUser.profilePicture = imageData;
        localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
        
        updateProfileIcon();
    }
}

function removeProfilePicture() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.username === loggedInUser.username);

    if (userIndex !== -1) {
        delete users[userIndex].profilePicture;
        localStorage.setItem('users', JSON.stringify(users));
        
        // Update loggedInUser in localStorage
        delete loggedInUser.profilePicture;
        localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
        
        updateProfileIcon();
    }
}

function updateProfileIcon() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    const profileIcons = document.querySelectorAll('.profile-icon');
    
    profileIcons.forEach(icon => {
        if (loggedInUser?.profilePicture) {
            // Replace the icon with the profile picture
            icon.innerHTML = `<img src="${loggedInUser.profilePicture}" alt="Profile" class="profile-icon-img">`;
            
            // Add styles to the image
            const img = icon.querySelector('.profile-icon-img');
            if (img) {
                img.style.width = '24px';
                img.style.height = '24px';
                img.style.borderRadius = '50%';
                img.style.objectFit = 'cover';
            }
        } else {
            // Revert to the default user icon
            icon.innerHTML = '<i class="fas fa-user"></i>';
        }
    });
}

function updatePersonalInfo() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.username === loggedInUser.username);

    if (userIndex !== -1) {
        const fullName = document.getElementById('full-name').value;
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const gender = document.getElementById('gender').value;

        // Check if username is being changed to one that already exists
        if (username !== users[userIndex].username) {
            const usernameExists = users.some(u => u.username === username && u.username !== users[userIndex].username);
            if (usernameExists) {
                alert('Username already exists. Please choose a different one.');
                return;
            }
        }

        // Update user data
        users[userIndex].fullname = fullName;
        users[userIndex].username = username;
        users[userIndex].email = email;
        users[userIndex].phone = phone;
        users[userIndex].gender = gender;

        localStorage.setItem('users', JSON.stringify(users));
        
        // Update loggedInUser in localStorage
        loggedInUser.fullname = fullName;
        loggedInUser.username = username;
        loggedInUser.email = email;
        loggedInUser.phone = phone;
        loggedInUser.gender = gender;
        localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));

        alert('Personal information updated successfully!');
    }
}

function updatePassword() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.username === loggedInUser.username);

    if (userIndex !== -1) {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Validate current password
        if (currentPassword !== users[userIndex].password) {
            alert('Current password is incorrect');
            return;
        }

        // Validate new password
        if (newPassword !== confirmPassword) {
            alert('New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        // Update password
        users[userIndex].password = newPassword;
        localStorage.setItem('users', JSON.stringify(users));
        
        // Update loggedInUser in localStorage
        loggedInUser.password = newPassword;
        localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));

        // Clear form
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';

        alert('Password updated successfully!');
    }
}

function loadReservations() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.username === loggedInUser.username);
    const reservationsContainer = document.getElementById('reservations-list');
    
    if (!reservationsContainer) return;
    
    if (!user || (!user.cart && !user.pickedItems)) {
        reservationsContainer.innerHTML = '<p class="empty-message">You have no active reservations.</p>';
        return;
    }

    let html = '';
    let totalSpent = 0;

    // Active reservations
    if (user.cart && user.cart.length > 0) {
        html += '<div class="reservation-section"><h3>Active Reservations</h3>';
        
        user.cart.forEach((item, index) => {
            // Skip pending items (only show reserved/confirmed)
            if (item.status === 'pending') return;
            
            let status, statusClass;
            if (item.status === 'confirmed') {
                status = 'confirmed';
                statusClass = 'status-confirmed';
            } else {
                status = 'reserved';
                statusClass = 'status-reserved';
                
                // Check if reservation is expired (3 days from reservedAt)
                if (item.reservedAt) {
                    const expiryDate = new Date(item.reservedAt);
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
                    <p>Price: ₱${item.price.toFixed(2)} each</p>
                    <p>Total: ₱${(item.price * item.quantity).toFixed(2)}</p>
                    <span class="status ${statusClass}">${status}</span>
                    ${item.reservedAt ? `<p>Reserved: ${new Date(item.reservedAt).toLocaleDateString()}</p>` : ''}
                </div>
                ${status === 'reserved' ? `
                <div class="reservation-actions">
                    <button class="btn-cancel" data-index="${index}">Cancel</button>
                </div>` : ''}
            </div>
            `;
            
            if (status === 'confirmed') {
                totalSpent += item.price * item.quantity;
            }
        });
        
        html += '</div>';
    }

    // Picked items history
    if (user.pickedItems && user.pickedItems.length > 0) {
        html += '<div class="reservation-section"><h3>Order History</h3>';
        
        user.pickedItems.forEach((item, index) => {
            html += `
            <div class="reservation-item picked">
                <img src="${item.image || 'assets/default-product.jpg'}" alt="${item.name}">
                <div class="reservation-details">
                    <h4>${item.name}</h4>
                    <p>Size: ${item.size} | Qty: ${item.quantity}</p>
                    <p>Price: ₱${item.price.toFixed(2)} each</p>
                    <p>Total: ₱${(item.price * item.quantity).toFixed(2)}</p>
                    <span class="status status-completed">Picked Up</span>
                    <p>Picked on: ${new Date(item.pickedAt).toLocaleDateString()}</p>
                </div>
                <div class="reservation-actions">
                    <button class="btn-delete" data-index="${index}" data-type="picked">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
            `;
            
            totalSpent += item.price * item.quantity;
        });
        
        html += '</div>';
    }

    // Add total spending
    if (totalSpent > 0) {
        html += `<div class="total-spending">Total Cost: ₱${totalSpent.toFixed(2)}</div>`;
    }

    reservationsContainer.innerHTML = html || '<p class="empty-message">You have no active reservations.</p>';
    
    // Add event listeners to cancel buttons
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', function() {
            cancelReservation(parseInt(this.dataset.index), false);
        });
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function() {
            cancelReservation(parseInt(this.dataset.index), true);
        });
    });
}

function cancelReservation(index, isPickedItem = false) {
    if (!confirm('Are you sure you want to ' + (isPickedItem ? 'delete' : 'cancel') + ' this item?')) return;

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    const userIndex = users.findIndex(u => u.username === loggedInUser.username);

    if (userIndex === -1) return;

    if (isPickedItem) {
        // Remove from picked items
        users[userIndex].pickedItems.splice(index, 1);
    } else {
        // Cancel reservation from cart
        const item = users[userIndex].cart[index];
        
        // Restore stock for reserved items
        if (item.status === 'reserved' || item.status === 'confirmed') {
            const products = JSON.parse(localStorage.getItem('products')) || [];
            const productIndex = products.findIndex(p => p.id === item.productId);
            if (productIndex !== -1 && products[productIndex].sizes) {
                products[productIndex].sizes[item.size] += item.quantity;
                localStorage.setItem('products', JSON.stringify(products));
            }
        }
        
        users[userIndex].cart.splice(index, 1);
    }

    localStorage.setItem('users', JSON.stringify(users));
    
    // Update loggedInUser
    const updatedUser = users[userIndex];
    localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));

    loadReservations();
    window.dispatchEvent(new Event('storage'));
}