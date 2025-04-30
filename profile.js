document.addEventListener('DOMContentLoaded', function() {
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

    // Profile picture upload
    const profileUpload = document.getElementById('profile-upload');
    const profilePicture = document.getElementById('profile-picture');
    const removePictureBtn = document.getElementById('remove-picture-btn');

    if (profileUpload) {
        profileUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const formData = new FormData();
                formData.append('profile_picture', file);
                formData.append('action', 'update_profile_picture');

                fetch('profile.php', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        profilePicture.src = data.image_url;
                        updateProfileIcon(data.image_url);
                    } else {
                        alert(data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error uploading profile picture');
                });
            }
        });
    }

    if (removePictureBtn) {
        removePictureBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to remove your profile picture?')) {
                fetch('profile.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: 'action=remove_profile_picture'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        profilePicture.src = data.image_url;
                        updateProfileIcon(data.image_url);
                    } else {
                        alert(data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error removing profile picture');
                });
            }
        });
    }

    // Personal info form submission
    const personalInfoForm = document.getElementById('personal-info-form');
    if (personalInfoForm) {
        personalInfoForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new URLSearchParams();
            formData.append('action', 'update_profile');
            formData.append('full_name', document.getElementById('full-name').value);
            formData.append('username', document.getElementById('username').value);
            formData.append('email', document.getElementById('email').value);
            formData.append('phone', document.getElementById('phone').value);
            formData.append('gender', document.getElementById('gender').value);

            fetch('profile.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                } else {
                    alert(data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error updating profile');
            });
        });
    }

    // Security form submission
    const securityForm = document.getElementById('security-form');
    if (securityForm) {
        securityForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new URLSearchParams();
            formData.append('action', 'update_password');
            formData.append('current_password', document.getElementById('current-password').value);
            formData.append('new_password', document.getElementById('new-password').value);
            formData.append('confirm_password', document.getElementById('confirm-password').value);

            fetch('profile.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    securityForm.reset();
                } else {
                    alert(data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error updating password');
            });
        });
    }

    // Load reservations
    loadReservations();

    // Setup login/logout link
    setupLoginLogout();
});

function updateProfileIcon(imageUrl = null) {
    if (!imageUrl) {
        // Get current profile picture from the image element
        const profilePicture = document.getElementById('profile-picture');
        if (profilePicture) {
            imageUrl = profilePicture.src;
        }
    }

    const profileIcons = document.querySelectorAll('.profile-icon');
    
    profileIcons.forEach(icon => {
        if (imageUrl && !imageUrl.includes('default-profile.png')) {
            // Replace the icon with the profile picture
            icon.innerHTML = `<img src="${imageUrl}" alt="Profile" class="profile-icon-img">`;
            
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

function loadReservations() {
    const reservationsContainer = document.getElementById('reservations-list');
    if (!reservationsContainer) return;
    
    fetch('profile.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'action=get_reservations'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderReservations(data.reservations);
        } else {
            reservationsContainer.innerHTML = `<p class="empty-message">${data.message}</p>`;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        reservationsContainer.innerHTML = '<p class="empty-message">Error loading reservations</p>';
    });
}

function renderReservations(reservations) {
    const reservationsContainer = document.getElementById('reservations-list');
    if (!reservationsContainer) return;
    
    if (!reservations || reservations.length === 0) {
        reservationsContainer.innerHTML = '<p class="empty-message">You have no active reservations.</p>';
        return;
    }

    let html = '';
    let totalSpent = 0;

    // Group reservations by status
    const activeReservations = reservations.filter(r => r.status === 'pending' || r.status === 'confirmed');
    const completedReservations = reservations.filter(r => r.status === 'completed');
    const cancelledReservations = reservations.filter(r => r.status === 'cancelled');

    // Active reservations
    if (activeReservations.length > 0) {
        html += '<div class="reservation-section"><h3>Active Reservations</h3>';
        
        activeReservations.forEach(reservation => {
            const items = JSON.parse(reservation.items);
            
            items.forEach(item => {
                let statusClass = '';
                if (reservation.status === 'confirmed') {
                    statusClass = 'status-confirmed';
                } else {
                    statusClass = 'status-reserved';
                    
                    const expiryDate = new Date(reservation.created_at);
                    expiryDate.setDate(expiryDate.getDate() + 3);
                    
                    if (new Date() > expiryDate) {
                        statusClass = 'status-expired';
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
                        <span class="status ${statusClass}">${reservation.status}</span>
                        <p>Reserved: ${new Date(reservation.created_at).toLocaleDateString()}</p>
                    </div>
                    ${reservation.status === 'pending' ? `
                    <div class="reservation-actions">
                        <button class="btn-cancel" data-id="${reservation.id}">Cancel</button>
                    </div>` : ''}
                </div>
                `;
                
                if (reservation.status === 'confirmed') {
                    totalSpent += item.price * item.quantity;
                }
            });
        });
        
        html += '</div>';
    }

    // Completed reservations
    if (completedReservations.length > 0) {
        html += '<div class="reservation-section"><h3>Order History</h3>';
        
        completedReservations.forEach(reservation => {
            const items = JSON.parse(reservation.items);
            
            items.forEach(item => {
                html += `
                <div class="reservation-item picked">
                    <img src="${item.image || 'assets/default-product.jpg'}" alt="${item.name}">
                    <div class="reservation-details">
                        <h4>${item.name}</h4>
                        <p>Size: ${item.size} | Qty: ${item.quantity}</p>
                        <p>Price: ₱${item.price.toFixed(2)} each</p>
                        <p>Total: ₱${(item.price * item.quantity).toFixed(2)}</p>
                        <span class="status status-completed">Completed</span>
                        <p>Completed on: ${new Date(reservation.updated_at).toLocaleDateString()}</p>
                    </div>
                </div>
                `;
                
                totalSpent += item.price * item.quantity;
            });
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
            cancelReservation(this.dataset.id);
        });
    });
}

function cancelReservation(reservationId) {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;

    const formData = new URLSearchParams();
    formData.append('action', 'cancel_reservation');
    formData.append('reservation_id', reservationId);

    fetch('profile.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
            loadReservations();
        } else {
            alert(data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error cancelling reservation');
    });
}

function setupLoginLogout() {
    const loginLink = document.getElementById('login-logout-link');
    
    if (!loginLink) return;
    
    loginLink.textContent = 'Logout';
    loginLink.href = '#';
    loginLink.onclick = function(e) {
        e.preventDefault();
        
        // You might want to make an AJAX call to logout.php here
        // For now, we'll just redirect to logout.php
        window.location.href = 'logout.php';
    };
}