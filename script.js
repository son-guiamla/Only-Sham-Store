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
   REVIEW SLIDER FUNCTIONS
   ====================== */

/**
 * Initializes the review slider functionality
 */
function initReviewSlider() {
    try {
        const reviewCards = document.querySelectorAll('.review-card');
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        let currentIndex = 0;

        function showReview(index) {
            reviewCards.forEach((card, i) => {
                card.classList.toggle('active', i === index);
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                currentIndex = (currentIndex - 1 + reviewCards.length) % reviewCards.length;
                showReview(currentIndex);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                currentIndex = (currentIndex + 1) % reviewCards.length;
                showReview(currentIndex);
            });
        }

        if (reviewCards.length > 0) {
            setInterval(() => {
                currentIndex = (currentIndex + 1) % reviewCards.length;
                showReview(currentIndex);
            }, 5000);

            showReview(currentIndex);
        }
    } catch (error) {
        console.error('Error initializing review slider:', error);
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

            if (profileIcon) {
                profileIcon.href = 'javascript:void(0)';
                profileIcon.onclick = function() {
                    alert(`Logged in as: ${loggedInUser.username}\nName: ${loggedInUser.fullname}\nPhone: ${loggedInUser.phone}`);
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
   INITIALIZATION
   ====================== */

/**
 * Initializes all functionality when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Initialize general utilities
        initSmoothScrolling();
        
        // Initialize cart and reservation functionality
        setupLoginLogout();
        
        // Initialize review slider if it exists
        initReviewSlider();
        
        // Initialize countdown timer if it exists
        initCountdownTimer();
    } catch (error) {
        console.error('Error initializing application:', error);
    }
});
/* ======================
   QUICK VIEW FUNCTIONS
   ====================== */

// Initialize Quick View Modal
function initQuickView() {
    const quickViewBtns = document.querySelectorAll('.quick-view');
    const closeModal = document.querySelector('.close-modal');
    const modal = document.getElementById('quickViewModal');
    const addToCartBtn = document.getElementById('addToCartBtn');
    
    // Open modal with product details
    quickViewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            const productCard = this.closest('.product-card');
            openQuickView(productId, productCard);
        });
    });
    
    // Close modal
    closeModal.addEventListener('click', () => {
        closeQuickView();
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeQuickView();
        }
    });
    
    // Add to Cart button in modal
    addToCartBtn.addEventListener('click', function() {
        const productId = this.getAttribute('data-id');
        const sizeSelect = document.querySelector('#quickViewSizes .size-option.selected');
        const size = sizeSelect ? sizeSelect.getAttribute('data-size') : 'S';
        
        addToCart(productId, size);
        closeQuickView();
    });
}

// Open Quick View Modal
function openQuickView(productId, productCard) {
    const modal = document.getElementById('quickViewModal');
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
    document.getElementById('quickViewTitle').textContent = product.name;
    document.getElementById('quickViewImage').src = product.image || 'assets/default-product.jpg';
    document.getElementById('quickViewDescription').textContent = product.description || 'No description available';
    
    // Display price with sale info if applicable
    const priceElement = document.getElementById('quickViewPrice');
    if (isOnSale) {
        priceElement.innerHTML = `
            <span style="text-decoration: line-through; color: var(--light-text); margin-right: 10px;">
                ₱${product.price.toFixed(2)}
            </span>
            <span style="color: #ff4757; font-weight: bold;">
                ₱${salePrice.toFixed(2)}
            </span>
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
                });
                
                // Select first size by default
                if (availableSizes.indexOf(size) === 0) {
                    sizeOption.classList.add('selected');
                }
                
                sizesContainer.appendChild(sizeOption);
            });
        } else {
            sizesContainer.innerHTML = '<p>No sizes available</p>';
        }
    } else {
        sizesContainer.innerHTML = '<p>No size information</p>';
    }
    
    // Set product ID on Add to Cart button
    addToCartBtn.setAttribute('data-id', productId);
    
    // Show modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close Quick View Modal
function closeQuickView() {
    document.getElementById('quickViewModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Update your DOMContentLoaded event to include initQuickView
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Initialize general utilities
        initSmoothScrolling();
        
        // Initialize cart and reservation functionality
        setupLoginLogout();
        
        // Initialize review slider if it exists
        initReviewSlider();
        
        // Initialize countdown timer if it exists
        initCountdownTimer();
        
        // Initialize Quick View
        initQuickView();
    } catch (error) {
        console.error('Error initializing application:', error);
    }
});