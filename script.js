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

/**
 * Validates an email address
 * @param {string} email - The email to validate
 * @returns {boolean} True if email is valid
 */
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Displays an error message
 * @param {string} elementId - The ID of the error element
 * @param {string} message - The error message to display
 */
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

/**
 * Hides an error message
 * @param {string} elementId - The ID of the error element
 */
function hideError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

/**
 * Checks if a user is banned and redirects if necessary
 * @returns {boolean} True if user is not banned
 */
function checkUserBanStatus() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (loggedInUser) {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const currentUser = users.find(u => u.username === loggedInUser.username);
        
        if (currentUser?.banned) {
            localStorage.removeItem('loggedInUser');
            window.location.href = 'login.html?banned=true';
            return false;
        }
    }
    return true;
}

/* ======================
   AUTHENTICATION FUNCTIONS
   ====================== */

/**
 * Registers a new user
 * @param {string} fullname - User's full name
 * @param {string} username - User's username
 * @param {string} email - User's email
 * @param {string} phone - User's phone number
 * @param {string} password - User's password
 * @param {string} [gender=''] - User's gender (optional)
 * @param {string} [address=''] - User's address (optional)
 * @returns {boolean} True if registration was successful
 */
function registerUser(fullname, username, email, phone, password, gender = '', address = '') {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    if (users.some(user => user.username === username)) {
        alert('Username already exists');
        return false;
    }
    
    if (users.some(user => user.email === email)) {
        alert('Email already registered');
        return false;
    }
    
    const newUser = {
        fullname,
        username,
        email,
        phone,
        password,
        gender,
        address,
        profilePicture: '',
        reservations: [],
        cart: []
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    return true;
}

/* ======================
   CART & RESERVATION FUNCTIONS
   ====================== */

/**
 * Updates the cart count in the navbar
 */
function updateCartCount() {
    try {
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        const cartCountElements = document.querySelectorAll('#cart-count');

        if (!loggedInUser || !loggedInUser.cart) {
            cartCountElements.forEach(element => {
                if (element) element.textContent = '0';
            });
            return;
        }

        const activeReservations = loggedInUser.cart.filter(
            item => !item.status || item.status === 'pending'
        ).reduce((sum, item) => sum + item.quantity, 0);

        cartCountElements.forEach(element => {
            if (element) element.textContent = activeReservations;
        });
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
}

/**
 * Adds a product to the cart
 * @param {string} productId - The ID of the product to add
 * @param {string} size - The selected size of the product
 */
function addToCart(productId, size) {
    try {
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        if (!loggedInUser) {
            const confirmLogin = confirm('You need to login to add items to cart. Would you like to login now?');
            if (confirmLogin) {
                window.location.href = 'login.html';
            }
            return;
        }

        const products = JSON.parse(localStorage.getItem('products')) || [];
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            alert('Product not found');
            return;
        }
        
        // Check if size is available
        if (!product.sizes || !product.sizes[size] || product.sizes[size] <= 0) {
            alert('Selected size is out of stock');
            return;
        }
        
        // Get or initialize user's cart
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = users.findIndex(u => u.username === loggedInUser.username);
        
        if (userIndex === -1) return;
        
        if (!users[userIndex].cart) {
            users[userIndex].cart = [];
        }
        
        // Check if product already in cart
        const existingItemIndex = users[userIndex].cart.findIndex(
            item => item.productId === productId && item.size === size && (!item.status || item.status === 'pending')
        );
        
        if (existingItemIndex !== -1) {
            // Check if we have enough stock
            if (product.sizes[size] <= users[userIndex].cart[existingItemIndex].quantity) {
                alert(`Only ${product.sizes[size]} items left in stock for this size!`);
                return;
            }
            
            users[userIndex].cart[existingItemIndex].quantity += 1;
        } else {
            // Add new item to cart
            users[userIndex].cart.push({
                productId,
                name: product.name,
                price: product.price,
                image: product.image || 'assets/default-product.jpg',
                size,
                quantity: 1,
                status: 'pending',
                reservedAt: new Date().toISOString()
            });
        }
        
        // Update product stock
        const productIndex = products.findIndex(p => p.id === productId);
        if (productIndex !== -1 && products[productIndex].sizes) {
            products[productIndex].sizes[size] -= 1;
            localStorage.setItem('products', JSON.stringify(products));
        }
        
        localStorage.setItem('users', JSON.stringify(users));
        
        // Update loggedInUser data
        const updatedUser = users[userIndex];
        localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));
        
        updateCartCount();
        
        // Show success feedback
        const button = document.querySelector(`.add-to-cart[data-id="${productId}"]`);
        if (button) {
            const originalText = button.textContent;
            button.textContent = 'Added!';
            button.style.backgroundColor = '#4CAF50';
            setTimeout(() => {
                button.textContent = originalText;
                button.style.backgroundColor = '';
            }, 2000);
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('An error occurred while adding to cart');
    }
}

/* ======================
   LOGIN/LOGOUT FUNCTIONS
   ====================== */

/**
 * Sets up the login/logout functionality and cart buttons
 */
function setupLoginLogout() {
    try {
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        const loginLogoutLink = document.getElementById('login-logout-link');
        const profileIcon = document.querySelector('.profile-icon');
        const addToCartButtons = document.querySelectorAll('.add-to-cart');

        if (loggedInUser) {
            // User is logged in
            if (loginLogoutLink) {
                loginLogoutLink.textContent = 'Logout';
                loginLogoutLink.href = '#';
                loginLogoutLink.onclick = function(e) {
                    e.preventDefault();
                    localStorage.removeItem('loggedInUser');
                    window.location.href = 'index.html';
                };
            }

            if (addToCartButtons) {
                addToCartButtons.forEach(button => {
                    button.disabled = false;
                    button.addEventListener('click', function() {
                        const productCard = this.closest('.product-card');
                        const productId = this.getAttribute('data-id');
                        const sizeSelect = productCard.querySelector('.size-dropdown');
                        const size = sizeSelect ? sizeSelect.value : 'S';
                        addToCart(productId, size);
                    });
                });
            }
        } else {
            // User is not logged in
            if (loginLogoutLink) {
                loginLogoutLink.textContent = 'Login';
                loginLogoutLink.href = 'login.html';
            }

            if (profileIcon) {
                profileIcon.href = 'login.html';
            }

            if (addToCartButtons) {
                addToCartButtons.forEach(button => {
                    button.disabled = false;
                    button.addEventListener('click', function(e) {
                        e.preventDefault();
                        const confirmLogin = confirm('You need to login or create an account to reserve products. Would you like to login now?');
                        if (confirmLogin) {
                            window.location.href = 'login.html';
                        }
                    });
                });
            }
        }

        updateCartCount();
    } catch (error) {
        console.error('Error setting up login/logout:', error);
    }
}

/* ======================
   QUICK VIEW FUNCTIONS
   ====================== */

/**
 * Opens the quick view modal for a product
 * @param {string} productId - The ID of the product to display
 */
function openQuickView(productId) {
    try {
        const products = JSON.parse(localStorage.getItem('products')) || [];
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            alert('Product not found');
            return;
        }
        
        // Check if product is in any active flash sale
        const flashSales = JSON.parse(localStorage.getItem('flashSales')) || [];
        const now = new Date();
        let isOnSale = false;
        let salePrice = product.price;
        
        for (const sale of flashSales) {
            const start = new Date(sale.startTime);
            const end = new Date(sale.endTime);
            
            if (now >= start && now <= end) {
                // Check if product is included in this sale
                if (sale.scope === 'all' || 
                    (sale.scope === 'products' && sale.products.includes(productId)) ||
                    (sale.scope === 'categories' && sale.categories.includes(product.category))) {
                    
                    isOnSale = true;
                    if (sale.discountType === 'percentage') {
                        salePrice = product.price * (1 - sale.discountValue / 100);
                    } else {
                        salePrice = Math.max(0, product.price - sale.discountValue);
                    }
                    break;
                }
            }
        }
        
        // Update modal content
        document.getElementById('modalProductTitle').textContent = product.name;
        document.getElementById('modalProductImage').src = product.image || 'assets/default-product.jpg';
        document.getElementById('modalProductImage').onerror = function() {
            this.src = 'assets/default-product.jpg';
        };
        document.getElementById('modalProductDescription').textContent = product.description || 'No description available';
        
        // Display price with sale info if applicable
        const priceElement = document.getElementById('modalProductPrice');
        if (isOnSale) {
            priceElement.innerHTML = `
                <span class="original-price">₱${product.price.toFixed(2)}</span>
                <span class="discounted-price">₱${salePrice.toFixed(2)}</span>
            `;
            document.getElementById('quickViewSaleBadge').style.display = 'block';
        } else {
            priceElement.textContent = `₱${product.price.toFixed(2)}`;
            document.getElementById('quickViewSaleBadge').style.display = 'none';
        }
        
        // Populate size options
        const sizesContainer = document.getElementById('quickViewSizes');
        sizesContainer.innerHTML = '';
        
        if (product.sizes) {
            const availableSizes = Object.entries(product.sizes)
                .filter(([_, quantity]) => quantity > 0)
                .map(([size]) => size);
            
            if (availableSizes.length > 0) {
                availableSizes.forEach(size => {
                    const sizeOption = document.createElement('div');
                    sizeOption.className = 'size-option';
                    sizeOption.textContent = size;
                    sizeOption.setAttribute('data-size', size);
                    sizeOption.addEventListener('click', function() {
                        document.querySelectorAll('#quickViewSizes .size-option').forEach(opt => {
                            opt.classList.remove('selected');
                        });
                        this.classList.add('selected');
                        selectedQuickViewSize = size;
                    });
                    
                    // Select first size by default
                    if (availableSizes.indexOf(size) === 0) {
                        sizeOption.classList.add('selected');
                        selectedQuickViewSize = size;
                    }
                    
                    sizesContainer.appendChild(sizeOption);
                });
            } else {
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

// Track selected size in quick view
let selectedQuickViewSize = '';

// Initialize quick view functionality
function initQuickView() {
    // Close modal
    document.querySelector('.close-modal').addEventListener('click', closeQuickView);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('productModal')) {
            closeQuickView();
        }
    });
    
    // Add to Cart button in modal
    document.getElementById('addToCartBtn').addEventListener('click', function() {
        const productId = this.getAttribute('data-id');
        addToCart(productId, selectedQuickViewSize);
        closeQuickView();
    });

    // Reserve button in modal
    document.getElementById('reserveInModal').addEventListener('click', function() {
        const productId = this.getAttribute('data-id');
        addToCart(productId, selectedQuickViewSize);
        closeQuickView();
        window.location.href = 'cart.html';
    });
}

/* ======================
   FLASH SALE FUNCTIONS
   ====================== */

function loadFlashSale() {
    const flashSales = JSON.parse(localStorage.getItem('flashSales')) || [];
    const now = new Date();
    
    // Find active flash sales (current time is between start and end time)
    const activeFlashSales = flashSales.filter(sale => {
        const start = new Date(sale.startTime);
        const end = new Date(sale.endTime);
        return now >= start && now <= end;
    });
    
    const container = document.getElementById('flash-sale-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (activeFlashSales.length === 0) {
        // No active flash sales
        container.style.display = 'none';
        return;
    }
    
    // Display the first active flash sale (you could modify to show multiple)
    const sale = activeFlashSales[0];
    const start = new Date(sale.startTime);
    const end = new Date(sale.endTime);
    
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
                    ${sale.discountType === 'percentage' ? 
                      `${sale.discountValue}% OFF` : 
                      `₱${sale.discountValue} OFF`}
                </p>
                <p class="flash-sale-time">Ends in: ${days}d ${hours}h ${minutes}m</p>
                <a href="#product-grid" class="flash-sale-button">Shop Now</a>
            </div>
        </div>
    `;
    
    container.style.display = 'block';
}

/* ======================
   REVIEW FUNCTIONS
   ====================== */

// Global scope for stars and rating
let selectedRating = 0;
let stars = [];

/**
 * Loads and displays all shop reviews
 */
function loadReviews() {
    const reviews = JSON.parse(localStorage.getItem('shopReviews')) || [];
    const container = document.getElementById('reviews-container');
    container.innerHTML = '';

    if (reviews.length === 0) {
        container.innerHTML = '<p class="empty-message">No reviews yet. Be the first to review!</p>';
        return;
    }

    reviews.forEach(review => {
        const reviewElement = document.createElement('div');
        reviewElement.className = 'review-item';
        reviewElement.innerHTML = `
            <div class="review-header">
                <img src="${review.profilePicture || 'assets/default-profile.png'}" alt="${review.username}" class="reviewer-avatar">
                <div>
                    <div class="reviewer-name">${review.username}</div>
                    <div class="review-date">${new Date(review.date).toLocaleDateString()}</div>
                </div>
            </div>
            <div class="review-rating">
                ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
            </div>
            <div class="review-text">${review.comment}</div>
        `;
        container.appendChild(reviewElement);
    });
}

/**
 * Submits a new review
 */
function submitReview() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!loggedInUser) {
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

    const reviews = JSON.parse(localStorage.getItem('shopReviews')) || [];

    reviews.push({
        username: loggedInUser.username,
        profilePicture: loggedInUser.profilePicture,
        rating,
        comment,
        date: new Date().toISOString()
    });

    localStorage.setItem('shopReviews', JSON.stringify(reviews));

    // Reset form
    document.getElementById('review-comment').value = '';
    stars.forEach(star => {
        star.classList.remove('fas');
        star.classList.add('far');
    });
    document.querySelector('.rating-text').textContent = '0/5';
    selectedRating = 0;

    // Reload reviews
    loadReviews();
    alert('Thank you for your review!');
}

/**
 * Initializes review functionality
 */
function initReviews() {
    // Load reviews
    loadReviews();

    // Handle review submission
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

    document.getElementById('submit-review').addEventListener('click', submitReview);
}

/* ======================
   INITIALIZATION
   ====================== */

/**
 * Initializes all functionality when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Check ban status first
        if (!checkUserBanStatus()) return;
        
        // Initialize general utilities
        initSmoothScrolling();
        initQuickView();
        
        // Initialize cart and reservation functionality
        setupLoginLogout();
        
        // Load flash sale
        loadFlashSale();
        
        // Initialize reviews if on a page with reviews
        if (document.getElementById('reviews-container')) {
            initReviews();
        }
        
        // Listen for flash sale updates from admin
        window.addEventListener('storage', function(e) {
            if (e.key === 'flashSales') {
                loadFlashSale();
            }
        });
    } catch (error) {
        console.error('Error initializing application:', error);
    }
});