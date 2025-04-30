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
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}

/* ======================
   AUTHENTICATION FUNCTIONS
   ====================== */

/**
 * Checks authentication status with server
 */
async function checkAuthStatus() {
    try {
        const response = await fetch('auth.php?action=check');
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error checking auth status:', error);
        return { logged_in: false };
    }
}

/**
 * Sets up the login/logout link in the navigation
 */
async function setupLoginLogout() {
    try {
        const loginLink = document.getElementById('login-logout-link');
        if (!loginLink) return;

        const authStatus = await checkAuthStatus();
        
        if (authStatus.logged_in) {
            loginLink.textContent = 'Logout';
            loginLink.href = 'auth.php?action=logout';
            loginLink.onclick = async function(e) {
                e.preventDefault();
                try {
                    const response = await fetch('auth.php?action=logout');
                    if (response.ok) {
                        window.location.href = 'index.php';
                    }
                } catch (error) {
                    console.error('Logout error:', error);
                }
            };
        } else {
            loginLink.textContent = 'Login';
            loginLink.href = 'login.php';
            loginLink.onclick = null;
        }
    } catch (error) {
        console.error('Error setting up login/logout:', error);
    }
}

/* ======================
   CART & RESERVATION FUNCTIONS
   ====================== */

/**
 * Adds an item to the cart
 */
async function addToCart(productId, size, status = 'pending') {
    try {
        const authStatus = await checkAuthStatus();
        if (!authStatus.logged_in) {
            const confirmLogin = confirm('You need to login to add items to cart. Would you like to login now?');
            if (confirmLogin) {
                window.location.href = 'login.php';
            }
            return;
        }
        
        const response = await fetch('cart.php?action=add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                product_id: productId,
                size: size,
                quantity: 1,
                status: status,
                csrf_token: getCsrfToken()
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add to cart');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to add to cart');
        }
        
        await updateCartCount();
        
        const button = document.querySelector(`.add-to-cart[data-id="${productId}"]`);
        if (button) {
            const originalText = button.textContent;
            button.textContent = status === 'reserved' ? 'Reserved!' : 'Added!';
            button.style.backgroundColor = status === 'reserved' ? '#2196F3' : '#4CAF50';
            setTimeout(() => {
                button.textContent = originalText;
                button.style.backgroundColor = '';
            }, 2000);
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert(error.message || 'An error occurred while adding to cart');
    }
}

/**
 * Updates the cart count display
 */
async function updateCartCount() {
    try {
        const authStatus = await checkAuthStatus();
        const cartCountElements = document.querySelectorAll('#cart-count');

        if (!authStatus.logged_in) {
            cartCountElements.forEach(element => {
                if (element) element.textContent = '0';
            });
            return;
        }
        
        const response = await fetch('cart.php?action=count');
        if (!response.ok) throw new Error('Failed to get cart count');
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to get cart count');
        }
        
        const activeItems = data.count || 0;
        
        cartCountElements.forEach(element => {
            if (element) element.textContent = activeItems;
        });
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
}

/**
 * Sets up event listeners for all add-to-cart buttons on the page
 */
function setupAddToCartButtons() {
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            const productCard = this.closest('.product-card');
            const sizeSelect = productCard?.querySelector('.size-dropdown');
            const size = sizeSelect ? sizeSelect.value : 'S';
            addToCart(productId, size);
        });
    });
}

/* ======================
   QUICK VIEW FUNCTIONS
   ====================== */

let selectedQuickViewSize = '';

/**
 * Opens the quick view modal for a product
 */
async function openQuickView(productId) {
    try {
        const response = await fetch(`products.php?action=get&id=${productId}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Product not found');
        }
        
        const data = await response.json();
        
        if (!data.success || !data.product) {
            throw new Error(data.error || 'Product not found');
        }
        
        const product = data.product;
        
        // Update modal content
        document.getElementById('modalProductTitle').textContent = product.name;
        document.getElementById('modalProductImage').src = product.image || 'assets/default-product.jpg';
        document.getElementById('modalProductImage').onerror = function() {
            this.src = 'assets/default-product.jpg';
        };
        document.getElementById('modalProductDescription').textContent = product.description || 'No description available';
        
        // Display price with sale info if applicable
        const priceElement = document.getElementById('modalProductPrice');
        if (product.original_price) {
            priceElement.innerHTML = `
                <span class="original-price">₱${product.original_price.toFixed(2)}</span>
                <span class="discounted-price">₱${product.price.toFixed(2)}</span>
            `;
            document.getElementById('quickViewSaleBadge').style.display = 'block';
            document.getElementById('quickViewSaleBadge').textContent = product.discount_text || 'Sale';
        } else {
            priceElement.textContent = `₱${product.price.toFixed(2)}`;
            document.getElementById('quickViewSaleBadge').style.display = 'none';
        }
        
        // Populate size options
        const sizesContainer = document.getElementById('quickViewSizes');
        sizesContainer.innerHTML = '';
        
        if (product.sizes && product.sizes.length > 0) {
            product.sizes.forEach(size => {
                if (size.stock > 0) {
                    const sizeOption = document.createElement('div');
                    sizeOption.className = 'size-option';
                    sizeOption.textContent = size.name;
                    sizeOption.setAttribute('data-size', size.name);
                    sizeOption.addEventListener('click', function() {
                        document.querySelectorAll('#quickViewSizes .size-option').forEach(opt => {
                            opt.classList.remove('selected');
                        });
                        this.classList.add('selected');
                        selectedQuickViewSize = size.name;
                    });
                    
                    // Select first available size by default
                    if (selectedQuickViewSize === '' && size.stock > 0) {
                        sizeOption.classList.add('selected');
                        selectedQuickViewSize = size.name;
                    }
                    
                    sizesContainer.appendChild(sizeOption);
                }
            });
            
            if (sizesContainer.children.length === 0) {
                sizesContainer.innerHTML = '<p class="empty-message">No sizes available</p>';
            }
        } else {
            sizesContainer.innerHTML = '<p class="empty-message">No size information</p>';
        }
        
        // Set product ID on buttons
        document.getElementById('addToCartBtn').setAttribute('data-id', productId);
        document.getElementById('reserveInModal').setAttribute('data-id', productId);
        
        // Show modal
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
    // Close modal
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeQuickView);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('productModal')) {
            closeQuickView();
        }
    });
    
    // Add to Cart button in modal
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            addToCart(productId, selectedQuickViewSize);
            closeQuickView();
        });
    }
    
    // Reserve button in modal
    const reserveInModal = document.getElementById('reserveInModal');
    if (reserveInModal) {
        reserveInModal.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            addToCart(productId, selectedQuickViewSize, 'reserved');
            closeQuickView();
            window.location.href = 'cart.php';
        });
    }
}

/* ======================
   REVIEW FUNCTIONS
   ====================== */

let selectedRating = 0;
let stars = [];

/**
 * Loads and displays reviews
 */
async function loadReviews() {
    try {
        const response = await fetch('reviews.php?action=get');
        if (!response.ok) throw new Error('Failed to load reviews');
        
        const data = await response.json();
        const container = document.getElementById('reviews-container');
        container.innerHTML = '';

        if (!data.success || data.reviews.length === 0) {
            container.innerHTML = '<p class="empty-message">No reviews yet. Be the first to review!</p>';
            return;
        }

        data.reviews.forEach(review => {
            const reviewElement = document.createElement('div');
            reviewElement.className = 'review-item';
            
            reviewElement.innerHTML = `
                <div class="review-header">
                    <img src="${review.profile_pic || 'assets/default-profile.png'}" alt="${review.username}" class="reviewer-avatar">
                    <div>
                        <div class="reviewer-name">${review.username}</div>
                        <div class="review-date">${new Date(review.created_at).toLocaleDateString()}</div>
                    </div>
                </div>
                <div class="review-rating">
                    ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                </div>
                <div class="review-text">${review.comment}</div>
            `;
            container.appendChild(reviewElement);
        });
    } catch (error) {
        console.error('Error loading reviews:', error);
        const container = document.getElementById('reviews-container');
        container.innerHTML = '<p class="error-message">Failed to load reviews. Please try again later.</p>';
    }
}

/**
 * Submits a new review
 */
async function submitReview() {
    try {
        const authStatus = await checkAuthStatus();
        if (!authStatus.logged_in) {
            alert('Please login to submit a review');
            return;
        }

        const comment = document.getElementById('review-comment').value.trim();
        const rating = selectedRating;

        if (rating === 0) {
            alert('Please select a rating');
            return;
        }

        if (comment === '') {
            alert('Please enter your review comment');
            return;
        }

        const response = await fetch('reviews.php?action=add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                rating: rating,
                comment: comment,
                csrf_token: getCsrfToken()
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to submit review');
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to submit review');
        }

        // Reset form
        document.getElementById('review-comment').value = '';
        stars.forEach(star => {
            star.classList.remove('fas');
            star.classList.add('far');
        });
        document.querySelector('.rating-text').textContent = '0/5';
        selectedRating = 0;

        // Reload reviews
        await loadReviews();
        alert('Thank you for your review!');
    } catch (error) {
        console.error('Error submitting review:', error);
        alert(error.message || 'An error occurred while submitting your review');
    }
}

/**
 * Initializes review functionality
 */
function initReviews() {
    // Load reviews
    loadReviews();

    // Handle star rating selection
    stars = document.querySelectorAll('.stars i');

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
            document.querySelector('.rating-text').textContent = `${selectedRating}/5`;
        });
    });

    // Handle review submission
    const submitBtn = document.getElementById('submit-review');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitReview);
    }
}

/* ======================
   FLASH SALE FUNCTIONS
   ====================== */

/**
 * Loads and displays active flash sales
 */
async function loadFlashSale() {
    try {
        const response = await fetch('sales.php?action=active');
        
        if (!response.ok) {
            throw new Error('Failed to load flash sale');
        }
        
        const data = await response.json();
        const container = document.getElementById('flash-sale-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!data.success || data.sales.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        // Display the first active flash sale
        const sale = data.sales[0];
        const now = new Date();
        const end = new Date(sale.end_time);
        
        // Calculate time left
        const diff = end - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        container.innerHTML = `
            <div class="flash-sale-banner">
                <div class="flash-sale-content">
                    <h2>${sale.name}</h2>
                    <p class="flash-sale-discount">
                        ${sale.discount_type === 'percentage' ? 
                          `${sale.discount_value}% OFF` : 
                          `₱${sale.discount_value} OFF`}
                    </p>
                    <p class="flash-sale-time">Ends in: ${days}d ${hours}h ${minutes}m</p>
                    <a href="#product-grid" class="flash-sale-button">Shop Now</a>
                </div>
            </div>
        `;
        
        container.style.display = 'block';
    } catch (error) {
        console.error('Error loading flash sale:', error);
    }
}

/* ======================
   UTILITY FUNCTIONS
   ====================== */

/**
 * Gets CSRF token from meta tag
 */
function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
}

/* ======================
   INITIALIZATION
   ====================== */

/**
 * Initializes all functionality when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize general utilities
        initSmoothScrolling();
        initQuickView();
        
        // Initialize authentication functionality
        await setupLoginLogout();
        
        // Initialize cart and reservation functionality
        setupAddToCartButtons();
        await updateCartCount();
        
        // Initialize reviews functionality
        initReviews();
        
        // Load flash sale if on index page
        if (window.location.pathname.includes('index.php') || window.location.pathname === '/') {
            await loadFlashSale();
        }
    } catch (error) {
        console.error('Error initializing application:', error);
    }
});

// Listen for storage events (for real-time updates)
window.addEventListener('storage', function(e) {
    if (e.key === 'cartUpdate') {
        updateCartCount();
    }
});