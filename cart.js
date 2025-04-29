import { CART_ENDPOINT } from './config.js';
import { 
    checkUserBanStatus, 
    setupLoginLogout, 
    updateCartCount, 
    authFetch 
} from './auth.js';

document.addEventListener('DOMContentLoaded', async function() {
    if (!await checkUserBanStatus()) return;
    
    try {
        await loadCartItems();
        updateCartCount();
        setupLoginLogout();
    } catch (error) {
        console.error('Cart initialization error:', error);
        document.getElementById('cart-items').innerHTML = 
            `<div class="error">${error.message || 'Failed to load cart'}</div>`;
    }
});

async function loadCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    cartItemsContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            Loading your cart...
        </div>
    `;
    
    try {
        const response = await authFetch(CART_ENDPOINT);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to load cart');
        }
        
        const { activeItems, orderHistory } = await response.json();
        renderCartItems(activeItems, orderHistory);
    } catch (error) {
        console.error('Error loading cart:', error);
        throw error;
    }
}

function renderCartItems(activeItems, orderHistory) {
    const cartItemsContainer = document.getElementById('cart-items');
    
    if (!activeItems?.length && !orderHistory?.length) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Your cart is empty</p>
                <a href="index.html" class="btn">Continue Shopping</a>
            </div>
        `;
        updateSummary(0, 0, 0, 0);
        return;
    }
    
    let html = '';
    
    if (activeItems?.length) {
        html += `
            <div class="cart-section">
                <h3>Active Reservations</h3>
                ${activeItems.map(item => renderCartItem(item)).join('')}
            </div>
        `;
    }
    
    if (orderHistory?.length) {
        html += `
            <div class="cart-section">
                <h3>Order History</h3>
                ${orderHistory.map(item => renderCartItem(item, true)).join('')}
            </div>
        `;
    }
    
    cartItemsContainer.innerHTML = html;
    
    // Calculate summary
    const subtotal = activeItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
    const tax = subtotal * 0.12; // 12% tax
    const shipping = subtotal > 0 ? 50 : 0; // Flat shipping fee
    const total = subtotal + tax + shipping;
    
    updateSummary(subtotal, tax, shipping, total);
}

function renderCartItem(item, isHistory = false) {
    return `
        <div class="cart-item" data-id="${item.id}">
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <p>Size: ${item.size}</p>
                <p>Quantity: ${item.quantity}</p>
                <p>Price: ₱${(item.price * item.quantity).toFixed(2)}</p>
                ${item.reservedAt ? `<p>Reserved: ${new Date(item.reservedAt).toLocaleDateString()}</p>` : ''}
                ${item.status === 'confirmed' ? `<p class="confirmed">Confirmed (Pickup within 3 days)</p>` : ''}
            </div>
            <div class="cart-item-actions">
                ${!isHistory ? `
                    ${item.status !== 'confirmed' ? `
                        <button class="btn confirm-btn" onclick="confirmCartItem('${item.id}')">Confirm</button>
                    ` : ''}
                    <button class="btn cancel-btn" onclick="cancelCartItem('${item.id}', ${isHistory})">
                        ${isHistory ? 'Delete' : 'Cancel'}
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function updateSummary(subtotal, tax, shipping, total) {
    document.getElementById('subtotal').textContent = `₱${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `₱${tax.toFixed(2)}`;
    document.getElementById('shipping').textContent = `₱${shipping.toFixed(2)}`;
    document.getElementById('total').textContent = `₱${total.toFixed(2)}`;
}

window.confirmCartItem = async function(itemId) {
    if (!confirm('Confirm this reservation?')) return;
    
    try {
        const button = document.querySelector(`.confirm-btn[onclick="confirmCartItem('${itemId}')"]`);
        if (button) {
            button.disabled = true;
            button.textContent = 'Confirming...';
        }
        
        const response = await authFetch(`${CART_ENDPOINT}${itemId}/confirm`, {
            method: 'PUT'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        await loadCartItems();
        updateCartCount();
        alert('Reservation confirmed! Please pickup within 3 days.');
    } catch (error) {
        console.error('Error confirming item:', error);
        alert(error.message);
        
        const button = document.querySelector(`.confirm-btn[onclick="confirmCartItem('${itemId}')"]`);
        if (button) {
            button.disabled = false;
            button.textContent = 'Confirm';
        }
    }
};

window.cancelCartItem = async function(itemId, isPicked = false) {
    if (!confirm(`Are you sure you want to ${isPicked ? 'delete' : 'cancel'} this item?`)) return;
    
    try {
        const button = document.querySelector(`.cancel-btn[onclick="cancelCartItem('${itemId}', ${isPicked})"]`);
        if (button) {
            button.disabled = true;
            button.textContent = isPicked ? 'Deleting...' : 'Canceling...';
        }
        
        const response = await authFetch(`${CART_ENDPOINT}${itemId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        await loadCartItems();
        updateCartCount();
    } catch (error) {
        console.error('Error removing item:', error);
        alert(error.message);
        
        const button = document.querySelector(`.cancel-btn[onclick="cancelCartItem('${itemId}', ${isPicked})"]`);
        if (button) {
            button.disabled = false;
            button.textContent = isPicked ? 'Delete' : 'Cancel';
        }
    }
};