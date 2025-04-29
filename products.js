import { 
    PRODUCTS_ENDPOINT,
    DISCOUNTS_ENDPOINT,
    CART_ENDPOINT
} from './config.js';
import { 
    setupLoginLogout, 
    updateCartCount, 
    isLoggedIn,
    authFetch
} from './auth.js';

document.addEventListener('DOMContentLoaded', async function() {
    try {
        const path = window.location.pathname;
        let category = null;
        
        if (path.includes('t-shirts.html')) category = 'T-Shirts';
        else if (path.includes('jeans.html')) category = 'Jeans';
        else if (path.includes('shoes.html')) category = 'Shoes';
        else if (path.includes('shorts.html')) category = 'Shorts';
        
        await loadProducts(category);
        updateCartCount();
        setupLoginLogout();
        displayActiveFlashSales();
    } catch (error) {
        console.error('Initialization error:', error);
        const productGrid = document.getElementById('product-grid');
        if (productGrid) {
            productGrid.innerHTML = `<div class="error">${error.message || 'Failed to load products'}</div>`;
        }
    }
});

async function loadProducts(category = null) {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;
    
    productGrid.innerHTML = '<div class="loading">Loading products...</div>';
    
    try {
        let url = PRODUCTS_ENDPOINT;
        if (category) url += `?category=${encodeURIComponent(category)}`;
        
        const response = await fetch(url);
        
        // Modify the error handling in loadProducts
        if (!response.ok) {
            const error = await response.json();
            const errorMessage = error.message || 'Failed to load products';
            productGrid.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-circle"></i>
                    ${errorMessage}
                    <button onclick="window.location.reload()">Retry</button>
                </div>
            `;
            throw new Error(errorMessage);
        }
        
        let products = await response.json();
        
        if (window.location.pathname.includes('index.html')) {
            products = products.filter(product => product.featured);
        }
        
        products = await applyDiscounts(products);
        renderProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        productGrid.innerHTML = `<div class="error">${error.message}</div>`;
    }
}

async function applyDiscounts(products) {
    try {
        const response = await fetch(`${DISCOUNTS_ENDPOINT}active`);
        
        if (!response.ok) return products;
        
        const discounts = await response.json();
        if (!discounts.length) return products;
        
        return products.map(product => {
            const discount = discounts.find(d => 
                d.scope === 'all' ||
                (d.scope === 'categories' && d.categories.includes(product.category)) ||
                (d.scope === 'products' && d.products.includes(product.id))
            );
            
            if (!discount) return product;
            
            const discounted = { ...product };
            discounted.originalPrice = product.price;
            
            if (discount.discountType === 'percentage') {
                discounted.price = product.price * (1 - discount.discountValue / 100);
            } else {
                discounted.price = Math.max(0, product.price - discount.discountValue);
            }
            
            discounted.discountText = discount.name || `${discount.discountValue}% OFF`;
            return discounted;
        });
    } catch (error) {
        console.error('Error applying discounts:', error);
        return products;
    }
}

function renderProducts(products) {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;
    
    if (!products.length) {
        productGrid.innerHTML = '<div class="empty">No products found</div>';
        return;
    }
    
    productGrid.innerHTML = '';
    
    products.forEach(product => {
        const availableSizes = product.sizes 
            ? Object.entries(product.sizes)
                .filter(([_, qty]) => qty > 0)
                .map(([size]) => size)
            : [];
            
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-image-container">
                <img src="<span class="math-inline">\{product\.image \|\| 'assets/default\-product\.jpg'\}" 
alt\="</span>{product.name}" 
                     class="product-image"
                     onerror="this.src='assets/default-product.jpg'">
                ${product.featured ? '<span class="featured-badge">Featured</span>' : ''}
                <span class="math-inline">\{product\.originalPrice ? '<span class\="discount\-flag"\>SALE</span\>' \: ''\}
<button class\="quick\-view\-btn" data\-id\="</span>{product.id}">
                    <i class="fas fa-eye"></i> Quick View
                </button>
            </div>
            <h3>${product.name}</h3>
            ${product.originalPrice ? `
                <p class="original-price">₱${product.originalPrice.toFixed(2)}</p>
                <p class="price discounted">₱${product.price.toFixed(2)}
                    <span class="discount-badge">${product.discountText}</span>
                </p>
            ` : `<p class="price">₱${product.price.toFixed(2)}</p>`}
            <div class="size-selection">
                <select class="size-dropdown" ${!availableSizes.length ? 'disabled' : ''}>
                    ${availableSizes.length 
                        ? availableSizes.map(size => `<option value="${size}">${size}</option>`).join('')
                        : '<option>Out of stock</option>'}
                </select>
            </div>
            <button class="add-to-cart" data-id="${product.id}" ${!availableSizes.length ? 'disabled' : ''}>
                ${!availableSizes.length ? 'Out of stock' : 'Add to Cart'}
            </button>
        `;
        
        productGrid.appendChild(productCard);
    });
    
    // Add event listeners
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', async function() {
            if (!isLoggedIn()) {
                const confirmLogin = confirm('Please login to add items to cart. Login now?');
                if (confirmLogin) window.location.href = 'login.html';
                return;
            }
            
            const productId = this.dataset.id;
            const size = this.closest('.product-card').querySelector('.size-dropdown').value;
            await addToCart(productId, size);
        });
    });
}

async function addToCart(productId, size) {
    try {
        const button = document.querySelector(`.add-to-cart[data-id="${productId}"]`);
        if (button) {
            button.disabled = true;
            button.textContent = 'Adding...';
        }
        
        const response = await authFetch(`${CART_ENDPOINT}add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productId, size, quantity: 1 })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        updateCartCount();
        
        // Visual feedback
        if (button) {
            button.textContent = 'Added!';
            button.style.backgroundColor = '#4CAF50';
            setTimeout(() => {
                button.textContent = 'Add to Cart';
                button.style.backgroundColor = '';
                button.disabled = false;
            }, 2000);
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert(error.message);
        const button = document.querySelector(`.add-to-cart[data-id="${productId}"]`);
        if (button) {
            button.textContent = 'Add to Cart';
            button.disabled = false;
        }
    }
}

async function displayActiveFlashSales() {
    try {
        const response = await fetch(`${DISCOUNTS_ENDPOINT}active`);
        
        if (!response.ok) {
            throw new Error('Failed to load flash sales');
        }
        
        const sales = await response.json();
        const container = document.getElementById('flash-sale-container');
        if (!container) return;
        
        if (!sales.length) {
            container.innerHTML = '<div class="no-sales">No active flash sales</div>';
            return;
        }
        
        container.innerHTML = sales.map(sale => `
            <div class="flash-sale" data-end="<span class="math-inline">\{sale\.endTime\}"\>
<h2\></span>{sale.name}</h2>
                <p>${sale.discountType === 'percentage' 
                    ? `${sale.discountValue}% OFF` 
                    : `₱${sale.discountValue} OFF`}</p>
                <div class="countdown">
                    <span class="days">00</span>d 
                    <span class="hours">00</span>h 
                    <span class="minutes">00</span>m
                </div>
                <a href="#product-grid" class="btn">Shop Now</a>
            </div>
        `).join('');
        
        initializeCountdowns();
    } catch (error) {
        console.error('Error displaying flash sales:', error);
    }
}

function initializeCountdowns() {
    document.querySelectorAll('.flash-sale').forEach(saleEl => {
        const endTime = new Date(saleEl.dataset.end).getTime();
        
        const updateTimer = () => {
            const now = new Date().getTime();
            const diff = endTime - now;
            
            if (diff <= 0) {
                saleEl.querySelector('.countdown').innerHTML = 'Sale ended';
                return;
            }
            
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            
            saleEl.querySelector('.days').textContent = days.toString().padStart(2, '0');
            saleEl.querySelector('.hours').textContent = hours.toString().padStart(2, '0');
            saleEl.querySelector('.minutes').textContent = minutes.toString().padStart(2, '0');
        };
        
        updateTimer();
        setInterval(updateTimer, 60000);
    });
}
