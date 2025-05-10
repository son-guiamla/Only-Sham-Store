/* ======================
   GENERAL UTILITY FUNCTIONS
   ====================== */

/**
 * Toggles the sidebar visibility
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.style.right = sidebar.style.right === '0px' ? '-250px' : '0px';
    }
}

/**
 * Initializes smooth scrolling for anchor links
 */
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

/* ======================
   CART & RESERVATION FUNCTIONS
   ====================== */

/**
 * Updates the cart count in the navbar
 */
async function updateCartCount() {
    try {
        const response = await fetch('includes/admin-api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_cart_count' })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to fetch cart count');
        
        const cartCountElements = document.querySelectorAll('#cart-count');
        const count = result.data.count || 0;
        cartCountElements.forEach(element => {
            if (element) element.textContent = count;
        });
    } catch (error) {
        console.error('Error updating cart count:', error);
        document.querySelectorAll('#cart-count').forEach(element => {
            if (element) element.textContent = '0';
        });
    }
}

/**
 * Loads products from the backend
 * @param {string|null} category - The category to filter products by
 * @param {string} containerId - The ID of the container to render products into
 */
async function loadProducts(category = null, containerId = 'product-grid') {
    try {
        const data = { action: 'get_products' };
        if (category) data.category = category;
        const response = await fetch('includes/admin-api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to load products');
        
        renderProducts(result.data.products || [], containerId);
    } catch (error) {
        console.error('Error loading products:', error);
        const productGrid = document.getElementById(containerId);
        if (productGrid) {
            productGrid.innerHTML = '<p class="empty-message">Error loading products. Please try again.</p>';
        }
    }
}

/**
 * Adds a product to the cart without redirecting
 * @param {string} productId - The ID of the product to add
 * @param {string} size - The selected size of the product
 */
async function addToCart(productId, size) {
    try {
        const response = await fetch('includes/admin-api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'add_to_cart', 
                product_id: productId, 
                size: size, 
                quantity: 1 
            })
        });
        const result = await response.json();
        if (!result.success) {
            if (result.error && result.error.includes('login')) {
                const confirmLogin = confirm('You need to login to add items to cart. Would you like to login now?');
                if (confirmLogin) window.location.href = 'login.php';
            } else {
                alert(result.error || 'An error occurred while adding to cart');
            }
            return;
        }
        await updateCartCount();
        // Refresh products based on current page
        const path = window.location.pathname;
        let category = null;
        if (path.includes('t-shirts.php')) category = 'T-Shirts';
        else if (path.includes('jeans.php')) category = 'Jeans';
        else if (path.includes('shoes.php')) category = 'Shoes';
        else if (path.includes('shorts.php')) category = 'Shorts';
        if (category) await loadProducts(category);
        alert('Product added to cart successfully!');
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('An error occurred while adding to cart');
    }
}

/* ======================
   QUICK VIEW FUNCTIONS
   ====================== */

/**
 * Opens the quick view modal for a product
 * @param {string} productId - The ID of the product to display
 */
async function openQuickView(productId) {
    try {
        const response = await fetch('includes/admin-api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_product', id: productId })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Product not found');
        
        const product = result.data.product;
        const baseUrl = 'http://localhost/onlyatsham/includes/';
        
        let imageSrc = product.image ? `${baseUrl}${product.image}` : `${baseUrl}assets/default-product.jpg`;
        imageSrc += `?t=${new Date().getTime()}`;

        document.getElementById('modalProductTitle').textContent = product.name;
        const modalImage = document.getElementById('modalProductImage');
        modalImage.src = imageSrc;
        modalImage.onerror = function() {
            console.error(`Failed to load image for product ID ${productId}: ${imageSrc}`);
            this.src = `${baseUrl}assets/default-product.jpg?t=${new Date().getTime()}`;
        };
        document.getElementById('modalProductDescription').textContent = product.description || 'No description available';
        
        const priceContainer = document.getElementById('modalProductPrice');
        const saleBadge = document.getElementById('quickViewSaleBadge');
        if (product.discount_applied) {
            priceContainer.innerHTML = `
                <span class="original-price">₱${parseFloat(product.original_price).toFixed(2)}</span>
                <span class="discounted-price">₱${parseFloat(product.discounted_price).toFixed(2)}</span>
            `;
            saleBadge.style.display = 'block';
            saleBadge.textContent = `${product.discount_applied.type === 'percentage' ? `${product.discount_applied.value}% OFF` : `₱${product.discount_applied.value} OFF`}`;
        } else {
            priceContainer.innerHTML = `₱${parseFloat(product.original_price).toFixed(2)}`;
            saleBadge.style.display = 'none';
        }

        const sizesContainer = document.getElementById('quickViewSizes');
        sizesContainer.innerHTML = '';
        
        if (product.sizes && Object.keys(product.sizes).length > 0) {
            const availableSizes = Object.entries(product.sizes)
                .filter(([_, qty]) => qty > 0)
                .map(([size]) => size);
            
            if (availableSizes.length > 0) {
                availableSizes.forEach(size => {
                    const sizeOption = document.createElement('div');
                    sizeOption.className = 'size-option';
                    sizeOption.textContent = size;
                    sizeOption.setAttribute('data-size', size);
                    sizeOption.addEventListener('click', function() {
                        document.querySelectorAll('#quickViewSizes .size-option').forEach(opt => opt.classList.remove('selected'));
                        this.classList.add('selected');
                        window.selectedQuickViewSize = size;
                    });
                    if (availableSizes.indexOf(size) === 0) {
                        sizeOption.classList.add('selected');
                        window.selectedQuickViewSize = size;
                    }
                    sizesContainer.appendChild(sizeOption);
                });
            } else {
                sizesContainer.innerHTML = '<p class="empty-message">No sizes available</p>';
            }
        } else {
            sizesContainer.innerHTML = '<p class="empty-message">No size information</p>';
        }

        document.getElementById('addToCartBtn').setAttribute('data-id', productId);
        document.getElementById('reserveInModal').setAttribute('data-id', productId);
        
        document.getElementById('productModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Error opening quick view:', error);
        alert('An error occurred while loading the product details');
    }
}

/**
 * Closes the quick view modal
 */
function closeQuickView() {
    document.getElementById('productModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

/**
 * Initializes quick view functionality
 */
function initQuickView() {
    document.querySelector('.close-modal').addEventListener('click', closeQuickView);
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('productModal')) {
            closeQuickView();
        }
    });
    
    document.getElementById('addToCartBtn').addEventListener('click', function() {
        const productId = this.getAttribute('data-id');
        addToCart(productId, window.selectedQuickViewSize);
        closeQuickView();
    });

    document.getElementById('reserveInModal').addEventListener('click', function() {
        const productId = this.getAttribute('data-id');
        addToCart(productId, window.selectedQuickViewSize);
        closeQuickView();
        window.location.href = 'cart.php';
    });
}

/* ======================
   PRODUCT FUNCTIONS
   ====================== */

/**
 * Renders products to the specified container
 * @param {Array} products - Array of product objects
 * @param {string} containerId - The ID of the container to render products into
 */
function renderProducts(products, containerId = 'product-grid') {
    const productGrid = document.getElementById(containerId);
    if (!productGrid) return;
    
    productGrid.innerHTML = '';
    const baseUrl = 'http://localhost/onlyatsham/includes/';
    
    products.forEach((product, index) => {
        const sizes = product.sizes ? Object.keys(product.sizes).filter(size => product.sizes[size] > 0) : [];
        const totalQuantity = product.sizes ? Object.values(product.sizes).reduce((sum, qty) => sum + qty, 0) : 0;
        const imageSrc = product.image ? `${baseUrl}${product.image}` : 'assets/default-product.jpg';
        
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        let priceHtml = `<p class="price">₱${parseFloat(product.original_price).toFixed(2)}</p>`;
        let saleBadge = '';
        
        if (product.discount_applied) {
            priceHtml = `
                <p class="price">
                    <span class="original-price">₱${parseFloat(product.original_price).toFixed(2)}</span>
                    <span class="discounted-price">₱${parseFloat(product.discounted_price).toFixed(2)}</span>
                </p>
            `;
            saleBadge = `<span class="sale-badge">${product.discount_applied.type === 'percentage' ? `${product.discount_applied.value}% OFF` : `₱${product.discount_applied.value} OFF`}</span>`;
        }
        
        productCard.innerHTML = `
            <div class="product-image-container">
                <img src="${imageSrc}" alt="${product.name}" class="product-image" onerror="this.src='assets/default-product.jpg'">
                ${product.featured ? '<span class="featured-badge">Featured</span>' : ''}
                ${saleBadge}
                <button class="quick-view-btn" data-id="${product.id}">
                    <i class="fas fa-eye"></i> Quick View
                </button>
            </div>
            <h3>${product.name}</h3>
            ${priceHtml}
            <p class="quantity">Quantity: ${totalQuantity}</p>
            <div class="size-selection">
                <label for="size-${index}">Size:</label>
                <select id="size-${index}" class="size-dropdown" ${sizes.length === 0 ? 'disabled' : ''}>
                    ${sizes.length > 0 ? 
                        sizes.map(size => `<option value="${size}">${size}</option>`).join('') : 
                        '<option value="">Out of stock</option>'}
                </select>
            </div>
            <button class="add-to-cart" data-id="${product.id}" ${sizes.length === 0 ? 'disabled' : ''}>
                ${sizes.length === 0 ? 'Out of stock' : 'Add to Cart'}
            </button>
        `;
        
        productGrid.appendChild(productCard);
    });
    
    // Add event listeners to add to cart buttons
    document.querySelectorAll(`#${containerId} .add-to-cart`).forEach(button => {
        button.addEventListener('click', function(e) {
            const productId = this.getAttribute('data-id');
            const productCard = this.closest('.product-card');
            const sizeSelect = productCard.querySelector('.size-dropdown');
            const size = sizeSelect ? sizeSelect.value : 'S';
            addToCart(productId, size);
        });
    });
    
    // Add event listeners to quick view buttons
    document.querySelectorAll(`#${containerId} .quick-view-btn`).forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const productId = this.getAttribute('data-id');
            openQuickView(productId);
        });
    });
}

/* ======================
   FLASH SALE FUNCTIONS
   ====================== */

/**
 * Displays active flash sales with countdown timers
 */
async function displayActiveFlashSales() {
    try {
        const response = await fetch('includes/admin-api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_active_flash_sales' })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to fetch flash sales');
        
        const flashSales = result.data.flash_sales || [];
        const flashSaleContainer = document.getElementById('flash-sale-container');
        if (!flashSaleContainer) return;
        
        if (flashSales.length === 0) {
            flashSaleContainer.innerHTML = `
                <div class="no-flash-sale">
                    <h3>No Active Flash Sales</h3>
                    <p>Check back later for exciting deals!</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        flashSales.forEach(sale => {
            html += `
                <div class="flash-sale-active" data-end="${sale.end_time}">
                    <h1>${sale.name}</h1>
                    <h2>${sale.discount_type === 'percentage' ? 
                        `${sale.discount_value}% OFF` : 
                        `₱${sale.discount_value} OFF`}</h2>
                    <div class="discount">Limited Time Offer!</div>
                    <div class="time-left">Ends in:</div>
                    <div class="countdown-timer">
                        <div class="timer-box">
                            <span class="days">00</span>
                            <span class="timer-label">Days</span>
                        </div>
                        <div class="timer-box">
                            <span class="hours">00</span>
                            <span class="timer-label">Hours</span>
                        </div>
                        <div class="timer-box">
                            <span class="minutes">00</span>
                            <span class="timer-label">Minutes</span>
                        </div>
                        <div class="timer-box">
                            <span class="seconds">00</span>
                            <span class="timer-label">Seconds</span>
                        </div>
                    </div>
                    <a href="#product-grid" class="shop-now-btn">Shop Now</a>
                </div>
            `;
        });
        
        flashSaleContainer.innerHTML = html;
        initializeCountdownTimers();
    } catch (error) {
        console.error('Error displaying flash sales:', error);
    }
}

/**
 * Initializes countdown timers for active flash sales
 */
function initializeCountdownTimers() {
    const flashSaleElements = document.querySelectorAll('.flash-sale-active');
    
    flashSaleElements.forEach(element => {
        const endTime = new Date(element.getAttribute('data-end')).getTime();
        
        function updateTimer() {
            const now = new Date().getTime();
            const distance = endTime - now;
            
            if (distance < 0) {
                clearInterval(timer);
                element.innerHTML = '<h3>Flash Sale Ended</h3>';
                return;
            }
            
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            element.querySelector('.days').textContent = days.toString().padStart(2, '0');
            element.querySelector('.hours').textContent = hours.toString().padStart(2, '0');
            element.querySelector('.minutes').textContent = minutes.toString().padStart(2, '0');
            element.querySelector('.seconds').textContent = seconds.toString().padStart(2, '0');
        }
        
        updateTimer();
        const timer = setInterval(updateTimer, 1000);
    });
}

/* ======================
   FEEDBACK FUNCTIONS
   ====================== */

/**
 * Initializes feedback functionality
 */
function initFeedback() {
    let selectedRating = 0;
    const stars = document.querySelectorAll('.stars i');
    const ratingText = document.querySelector('.rating-text');
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.getAttribute('data-rating'));
            stars.forEach((s, index) => {
                if (index < selectedRating) {
                    s.classList.remove('far');
                    s.classList.add('fas');
                } else {
                    s.classList.remove('fas');
                    s.classList.add('far');
                }
            });
            ratingText.textContent = `${selectedRating}/5`;
        });
    });

    const submitButton = document.getElementById('submit-review');
    if (submitButton) {
        submitButton.addEventListener('click', () => submitReview(selectedRating));
    }

    loadReviews();
}

/**
 * Loads and displays customer reviews
 */
async function loadReviews() {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    try {
        const response = await fetch('includes/admin-api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_feedback' })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to load reviews');

        const reviews = result.data.feedback || [];
        container.innerHTML = '';

        if (reviews.length === 0) {
            container.innerHTML = '<p class="empty-message">No reviews yet. Be the first to review!</p>';
            return;
        }

        const baseUrl = 'http://localhost/onlyatsham/';
        reviews.forEach(review => {
            const profileImage = review.profile_image ? 
                `${baseUrl}${review.profile_image}?t=${new Date().getTime()}` : 
                `${baseUrl}assets/default-profile.jpg`;

            const reviewElement = document.createElement('div');
            reviewElement.className = 'review-item';
            reviewElement.innerHTML = `
                <div class="review-header">
                    <img src="${profileImage}" alt="${review.username}" class="reviewer-avatar">
                    <div>
                        <div class="reviewer-name">${review.username}</div>
                        <div class="review-date">${new Date(review.created_at).toLocaleDateString()}</div>
                    </div>
                </div>
                <div class="review-rating">
                    ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                </div>
                <div class="review-text">${review.comment || 'No comment'}</div>
            `;
            container.appendChild(reviewElement);
        });
    } catch (error) {
        console.error('Error loading reviews:', error);
        container.innerHTML = '<p class="empty-message">Error loading reviews. Please try again.</p>';
    }
}

/**
 * Submits a new review
 * @param {number} rating - The selected rating (1-5)
 */
async function submitReview(rating) {
    try {
        const loginResponse = await fetch('includes/auth.php?action=check_login');
        const loginData = await loginResponse.json();
        if (!loginData.success || !loginData.data.loggedIn) {
            const confirmLogin = confirm('Please login to submit a review. Would you like to login now?');
            if (confirmLogin) window.location.href = 'login.php';
            return;
        }

        const comment = document.getElementById('review-comment').value.trim();
        if (rating === 0) {
            alert('Please select a rating');
            return;
        }
        if (!comment) {
            alert('Please enter your review comment');
            return;
        }

        const response = await fetch('includes/admin-api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'add_feedback',
                rating,
                comment
            })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to submit review');

        document.getElementById('review-comment').value = '';
        document.querySelectorAll('.stars i').forEach(star => {
            star.classList.remove('fas');
            star.classList.add('far');
        });
        document.querySelector('.rating-text').textContent = '0/5';

        await loadReviews();
        alert('Thank you for your review!');
    } catch (error) {
        console.error('Error submitting review:', error);
        alert(error.message || 'An error occurred while submitting your review');
    }
}

/* ======================
   INITIALIZATION
   ====================== */

/**
 * Initializes all functionality when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async function() {
    try {
        initSmoothScrolling();
        initQuickView();
        initFeedback();
        
        const path = window.location.pathname;
        let category = null;
        if (path.includes('t-shirts.php')) category = 'T-Shirts';
        else if (path.includes('jeans.php')) category = 'Jeans';
        else if (path.includes('shoes.php')) category = 'Shoes';
        else if (path.includes('shorts.php')) category = 'Shorts';
        
        // Only load products for category pages, not index.php
        if (category) {
            await loadProducts(category);
        }
        
        await updateCartCount();
        await displayActiveFlashSales();
    } catch (error) {
        console.error('Error initializing application:', error);
    }
});