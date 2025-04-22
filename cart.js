// Cart Page Script - Individual Confirmation Version

// Global utility function
function updateCartCount() {
    const cartCountElements = document.querySelectorAll('#cart-count');
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));

    if (!loggedInUser || !loggedInUser.cart) {
        cartCountElements.forEach(element => {
            element.textContent = '0';
        });
        return;
    }

    const activeItems = loggedInUser.cart.filter(
        item => item.status !== 'picked'
    ).reduce((sum, item) => sum + item.quantity, 0);

    cartCountElements.forEach(element => {
        element.textContent = activeItems;
    });
}

function updateSummary(totalItems, pendingItems, reservedItems, totalAmount) {
    const summaryItems = document.getElementById('summary-items');
    const summaryPending = document.getElementById('summary-pending');
    const summaryReserved = document.getElementById('summary-reserved');
    const summaryTotal = document.getElementById('summary-total');

    summaryItems.textContent = totalItems;
    summaryPending.textContent = pendingItems;
    summaryReserved.textContent = reservedItems;
    summaryTotal.textContent = `₱${totalAmount.toFixed(2)}`;
}

function cancelCartItem(index, isPicked = false) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    const userIndex = users.findIndex(u => u.username === loggedInUser.username);

    if (userIndex === -1) return;

    if (isPicked) {
        // Handle deleting picked items (order history)
        users[userIndex].pickedItems.splice(index, 1);
    } else {
        // Handle canceling reservations
        const item = users[userIndex].cart[index];
        
        // Update product stock if the item wasn't picked
        if (item.status !== 'picked') {
            const products = JSON.parse(localStorage.getItem('products')) || [];
            const productIndex = products.findIndex(p => p.id === item.productId);
            
            if (productIndex !== -1 && products[productIndex].sizes) {
                products[productIndex].sizes[item.size] += item.quantity;
                localStorage.setItem('products', JSON.stringify(products));
            }
        }

        // Remove the item from cart
        users[userIndex].cart.splice(index, 1);
    }

    localStorage.setItem('users', JSON.stringify(users));
    
    // Update loggedInUser
    const updatedUser = users[userIndex];
    localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));

    loadCartItems();
    updateCartCount();
    
    // Dispatch storage event to update admin interface
    window.dispatchEvent(new Event('storage'));
}

function confirmCartItem(index) {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    const userIndex = users.findIndex(u => u.username === loggedInUser.username);

    if (userIndex === -1) return;

    const item = users[userIndex].cart[index];
    
    if (item.status && item.status !== 'pending') {
        return; // Already confirmed
    }

    item.status = 'reserved';
    item.reservedAt = new Date().toISOString();
    
    localStorage.setItem('users', JSON.stringify(users));
    
    // Update loggedInUser
    const updatedUser = users[userIndex];
    localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));

    alert(`Reservation confirmed for ${item.name}! You have 3 days to pick it up.`);
    loadCartItems();
    updateCartCount();
    
    // Dispatch storage event to update admin interface
    window.dispatchEvent(new Event('storage'));
}

function cleanExpiredReservations() {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    let updated = false;

    users.forEach(user => {
        if (user.cart && user.cart.length > 0) {
            const now = new Date();
            user.cart = user.cart.filter(item => {
                if (item.status === 'picked') return true;
                if (!item.reservedAt) return true;
                
                const expiryDate = new Date(item.reservedAt);
                expiryDate.setDate(expiryDate.getDate() + 3);
                return expiryDate > now;
            });
            updated = true;
        }
    });

    if (updated) {
        localStorage.setItem('users', JSON.stringify(users));
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        if (loggedInUser) {
            const updatedUser = users.find(u => u.username === loggedInUser.username);
            if (updatedUser) {
                localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));
            }
        }
    }
}

function loadCartItems() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    const cartItemsContainer = document.getElementById('cart-items');
    
    if (!loggedInUser) {
        window.location.href = 'login.html';
        return;
    }

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.username === loggedInUser.username);

    if (userIndex === -1) return;

    const cartItems = users[userIndex].cart || [];
    const pickedItems = users[userIndex].pickedItems || [];

    if (cartItems.length === 0 && pickedItems.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Your reservation cart is empty</p>
                <a href="index.html#shop" class="btn">Continue Shopping</a>
            </div>
        `;
        updateSummary(0, 0, 0, 0);
        return;
    }

    let itemsHtml = '';
    let totalItems = 0;
    let pendingItems = 0;
    let reservedItems = 0;
    let totalAmount = 0;

    // Current reservations
    cartItems.forEach((item, index) => {
        totalItems += item.quantity;
        totalAmount += item.price * item.quantity;

        let statusClass, statusText;
        if (item.status === 'picked') {
            statusClass = 'status-picked';
            statusText = 'Picked Up';
        } else if (item.status === 'reserved' || item.status === 'confirmed') {
            statusClass = 'status-reserved';
            statusText = 'Reserved';
            reservedItems += item.quantity;
            
            const expiryDate = new Date(item.reservedAt);
            expiryDate.setDate(expiryDate.getDate() + 3);
            
            const now = new Date();
            const timeLeft = expiryDate - now;
            const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
            
            if (daysLeft <= 0) {
                statusClass = 'status-pending';
                statusText = 'Expired';
            }
        } else {
            statusClass = 'status-pending';
            statusText = 'Pending';
            pendingItems += item.quantity;
        }

        // Format expiry date with time
        let expiryDisplay = '';
        if (item.reservedAt && (item.status === 'reserved' || item.status === 'confirmed')) {
            const expiryDate = new Date(item.reservedAt);
            expiryDate.setDate(expiryDate.getDate() + 3);
            expiryDisplay = expiryDate.toLocaleString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }

        itemsHtml += `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-details">
                    <h3 class="cart-item-title">${item.name}</h3>
                    <p class="cart-item-price">₱${item.price.toFixed(2)}</p>
                    <p class="cart-item-size">Size: ${item.size}</p>
                    <p class="cart-item-quantity">Quantity: ${item.quantity}</p>
                    <span class="cart-item-status ${statusClass}">${statusText}</span>
                    ${(item.status === 'reserved' || item.status === 'confirmed') ? 
                        `<p class="cart-item-expiry">Pick up before: ${expiryDisplay}</p>` : ''}
                </div>
                ${item.status !== 'picked' ? `
                <div class="cart-item-actions">
                    ${item.status !== 'reserved' && item.status !== 'confirmed' ? 
                        `<button class="btn-confirm" data-index="${index}">
                            <i class="fas fa-check"></i> Confirm
                        </button>` : ''}
                    <button class="btn-cancel" data-index="${index}" data-picked="false">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>` : ''}
            </div>
        `;
    });

    // Picked items (order history)
    if (pickedItems.length > 0) {
        itemsHtml += `<h3 class="order-history-title">Order History</h3>`;
        
        pickedItems.forEach((item, index) => {
            totalItems += item.quantity;
            totalAmount += item.price * item.quantity;

            // Format picked date with time
            const pickedDate = item.pickedAt ? new Date(item.pickedAt).toLocaleString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }) : 'N/A';

            itemsHtml += `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                    <div class="cart-item-details">
                        <h3 class="cart-item-title">${item.name}</h3>
                        <p class="cart-item-price">₱${item.price.toFixed(2)}</p>
                        <p class="cart-item-size">Size: ${item.size}</p>
                        <p class="cart-item-quantity">Quantity: ${item.quantity}</p>
                        <span class="cart-item-status status-completed">Picked Up</span>
                        <p class="cart-item-expiry">Picked on: ${pickedDate}</p>
                    </div>
                    <div class="cart-item-actions">
                        <button class="btn-cancel" data-index="${index}" data-picked="true">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        });
    }

    cartItemsContainer.innerHTML = itemsHtml;
    updateSummary(totalItems, pendingItems, reservedItems, totalAmount);

    // Add event listeners to cancel buttons
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', function() {
            const isPicked = this.getAttribute('data-picked') === 'true';
            cancelCartItem(parseInt(this.getAttribute('data-index')), isPicked);
        });
    });

    // Add event listeners to confirm buttons
    document.querySelectorAll('.btn-confirm').forEach(btn => {
        btn.addEventListener('click', function() {
            confirmCartItem(parseInt(this.getAttribute('data-index')));
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    
    // Redirect to login if not logged in
    if (!loggedInUser) {
        window.location.href = 'login.html';
        return;
    }

    loadCartItems();
    updateCartCount();

    // Clean up expired reservations periodically
    setInterval(cleanExpiredReservations, 60000);
});