/**
 * Loads cart items from the backend and renders them with retry mechanism
 */
async function loadCartItems(retries = 3, delay = 1000) {
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) return;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch('includes/admin-api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_cart' })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Failed to load cart');

            const cartItems = result.data.cart || [];
            renderCartItems(cartItems);
            return; // Success, exit the retry loop
        } catch (error) {
            console.error(`Attempt ${attempt} - Error loading cart items:`, error);
            if (attempt === retries) {
                cartItemsContainer.innerHTML = `
                    <div class="empty-cart">
                        <i class="fas fa-shopping-cart"></i>
                        <p>Error loading reservations. Please try again later.</p>
                        <a href="index.php#shop" class="btn">Continue Shopping</a>
                    </div>
                `;
                return;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * Renders cart items and updates summary
 * @param {Array} cartItems - Array of cart item objects
 */
function renderCartItems(cartItems) {
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) return;

    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Your reservation cart is empty</p>
                <a href="index.php#shop" class="btn">Continue Shopping</a>
            </div>
        `;
        updateCartSummary(0, 0, 0, 0);
        return;
    }

    let totalItems = 0;
    let pendingItems = 0;
    let reservedItems = 0;
    let totalValue = 0;
    const baseUrl = 'http://localhost/onlyatsham/includes/';

    const html = cartItems.map(item => {
        const imageSrc = item.image ? `${baseUrl}${item.image}` : `${baseUrl}assets/default-product.jpg`;

        // Only count non-expired items in summary
        if (item.status !== 'expired') {
            totalItems += item.quantity;
            totalValue += item.total_price;
            if (item.status === 'pending') pendingItems += item.quantity;
            if (item.status === 'confirmed') reservedItems += item.quantity;
        }

        const expiryDate = new Date(item.expiry);
        let statusDisplay = item.status;
        let statusClass = `status-${item.status}`;
        let actions = '';

        // Action buttons based on status
        if (item.status === 'pending') {
            actions = `
                <button class="btn btn-confirm" data-id="${item.product_id}" data-size="${item.size}">Confirm</button>
                <button class="btn btn-remove" data-id="${item.product_id}" data-size="${item.size}">Remove</button>
            `;
        } else if (item.status === 'confirmed') {
            actions = `
                <button class="btn btn-remove" data-id="${item.product_id}" data-size="${item.size}">Remove</button>
            `;
        }

        let priceHtml = `Price: ₱${parseFloat(item.discounted_price).toFixed(2)}`;
        let saleBadge = '';
        if (item.discount_applied) {
            priceHtml = `
                Original: ₱${parseFloat(item.original_price).toFixed(2)}<br>
                Discounted: ₱${parseFloat(item.discounted_price).toFixed(2)}
            `;
            saleBadge = `<span class="sale-badge">${item.discount_applied.name.replace(/^gb:/i, '')}: ${item.discount_applied.type === 'percentage' ? `${item.discount_applied.value}% OFF` : `₱${item.discount_applied.value} OFF`}</span>`;
        }

        return `
            <div class="cart-item">
                <img src="${imageSrc}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <h3>${item.name}</h3>
                    <p>Size: ${item.size}</p>
                    <p>Quantity: ${item.quantity}</p>
                    <p>${priceHtml}</p>
                    <p>Total: ₱${parseFloat(item.total_price).toFixed(2)}</p>
                    <p>Status: <span class="${statusClass}">${statusDisplay}</span></p>
                    ${item.expiry && item.status !== 'expired' ? `<p>Expires: ${expiryDate.toLocaleString()}</p>` : ''}
                    ${saleBadge}
                </div>
                <div class="cart-item-actions">
                    ${actions}
                </div>
            </div>
        `;
    }).join('');

    cartItemsContainer.innerHTML = html;
    updateCartSummary(totalItems, pendingItems, reservedItems, totalValue);

    // Add event listeners for confirm and remove buttons
    document.querySelectorAll('.btn-confirm').forEach(button => {
        button.addEventListener('click', async () => {
            const productId = button.getAttribute('data-id');
            const size = button.getAttribute('data-size');
            await confirmCartItem(productId, size);
        });
    });

    document.querySelectorAll('.btn-remove').forEach(button => {
        button.addEventListener('click', async () => {
            const productId = button.getAttribute('data-id');
            const size = button.getAttribute('data-size');
            await removeFromCart(productId, size);
        });
    });
}

/**
 * Updates the cart summary section
 * @param {number} totalItems - Total number of non-expired items
 * @param {number} pendingItems - Number of pending items
 * @param {number} reservedItems - Number of reserved items
 * @param {number} totalValue - Total value of non-expired items
 */
function updateCartSummary(totalItems, pendingItems, reservedItems, totalValue) {
    const summaryItems = document.getElementById('summary-items');
    const summaryPending = document.getElementById('summary-pending');
    const summaryReserved = document.getElementById('summary-reserved');
    const summaryTotal = document.getElementById('summary-total');

    if (summaryItems) summaryItems.textContent = totalItems;
    if (summaryPending) summaryPending.textContent = pendingItems;
    if (summaryReserved) summaryReserved.textContent = reservedItems;
    if (summaryTotal) summaryTotal.textContent = `₱${parseFloat(totalValue).toFixed(2)}`;
}

/**
 * Confirms a cart item
 * @param {string} productId - The ID of the product
 * @param {string} size - The size of the product
 */
async function confirmCartItem(productId, size) {
    try {
        const response = await fetch('includes/admin-api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'confirm_cart_item',
                product_id: productId,
                size: size
            })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to confirm item');

        alert('Item confirmed successfully!');
        await loadCartItems();
    } catch (error) {
        console.error('Error confirming cart item:', error);
        alert(error.message || 'An error occurred while confirming the item');
    }
}

/**
 * Removes an item from the cart
 * @param {string} productId - The ID of the product
 * @param {string} size - The size of the product
 */
async function removeFromCart(productId, size) {
    try {
        const response = await fetch('includes/admin-api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'remove_from_cart',
                product_id: productId,
                size: size
            })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to remove item');

        alert('Item removed successfully!');
        await loadCartItems();
    } catch (error) {
        console.error('Error removing cart item:', error);
        alert(error.message || 'An error occurred while removing the item');
    }
}

/**
 * Initializes the cart page
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadCartItems();
    } catch (error) {
        console.error('Error initializing cart:', error);
    }
});