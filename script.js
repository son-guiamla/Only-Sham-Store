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

// Current OTP and phone number for password reset
let currentOTP = '';
let resetPhone = '';
let currentUserToReset = null;

// Utility functions for authentication
function showError(id, message) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
    }
}

function hideError(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
}

function validatePhone(phone) {
    return /^[0-9]{10,15}$/.test(phone);
}

function validatePassword(password) {
    return password.length >= 6;
}

// Tab switching for login/signup forms
function switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    const tabElement = document.querySelector(`.auth-tab:nth-child(${tab === 'login' ? 1 : 2})`);
    const formElement = document.getElementById(`${tab}-form`);
    
    if (tabElement) tabElement.classList.add('active');
    if (formElement) formElement.classList.add('active');
}

// Password visibility toggle
function togglePassword(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input && icon) {
        input.type = input.type === 'password' ? 'text' : 'password';
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    }
}

// Authentication functions
function login() {
    const usernameOrEmail = document.getElementById('login-username')?.value.trim();
    const password = document.getElementById('login-password')?.value.trim();
    const adminCode = document.getElementById('admin-code')?.value.trim();
    
    hideError('login-username-error');
    hideError('login-password-error');
    hideError('admin-code-error');

    let valid = true;
    if (!usernameOrEmail) { 
        showError('login-username-error', 'Username or email is required'); 
        valid = false; 
    }
    if (!password || !validatePassword(password)) {
        showError('login-password-error', 'Password must be at least 6 characters'); 
        valid = false;
    }
    if (!valid) return;

    if (usernameOrEmail.toLowerCase() === 'admin') {
        const adminCodeGroup = document.getElementById('admin-code-group');
        if (adminCodeGroup) adminCodeGroup.style.display = 'block';
        
        if (!adminCode) {
            return showError('admin-code-error', 'Admin code is required');
        }
        
        const admins = JSON.parse(localStorage.getItem('adminUsers')) || [];
        const admin = admins.find(a => a.username === usernameOrEmail && a.password === password && a.adminCode === adminCode);
        
        if (admin) {
            localStorage.setItem('loggedInAdmin', JSON.stringify(admin));
            const loginSuccess = document.getElementById('login-success');
            if (loginSuccess) {
                loginSuccess.textContent = 'Admin login successful! Redirecting...';
                loginSuccess.style.display = 'block';
            }
            return setTimeout(() => window.location.href = 'admin-dashboard.html', 1500);
        }
        return showError('admin-code-error', 'Invalid admin credentials');
    }

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => 
        (u.username === usernameOrEmail || u.email === usernameOrEmail) && 
        u.password === password
    );
    
    if (user) {
        if (user.banned) {
            const banReason = user.banReason || 'No reason provided';
            return showError('login-password-error', `Your account is banned. Reason: ${banReason}`);
        }
        
        localStorage.setItem('loggedInUser', JSON.stringify(user));
        const loginSuccess = document.getElementById('login-success');
        if (loginSuccess) {
            loginSuccess.textContent = 'Login successful! Redirecting...';
            loginSuccess.style.display = 'block';
        }
        return setTimeout(() => window.location.href = 'index.html', 1500);
    } else {
        showError('login-password-error', 'Invalid username/email or password');
    }
}

function signup() {
    const fullname = document.getElementById('signup-fullname')?.value.trim();
    const phone = document.getElementById('signup-phone')?.value.trim();
    const email = document.getElementById('signup-email')?.value.trim();
    const username = document.getElementById('signup-username')?.value.trim();
    const password = document.getElementById('signup-password')?.value.trim();
    const address = document.getElementById('signup-address')?.value.trim();

    hideError('signup-fullname-error');
    hideError('signup-phone-error');
    hideError('signup-email-error');
    hideError('signup-username-error');
    hideError('signup-password-error');

    let valid = true;
    if (!fullname) { 
        showError('signup-fullname-error', 'Full name is required'); 
        valid = false; 
    }
    if (!phone || !validatePhone(phone)) { 
        showError('signup-phone-error', 'Valid phone is required'); 
        valid = false; 
    }
    if (!email || !validateEmail(email)) { 
        showError('signup-email-error', 'Valid email is required'); 
        valid = false; 
    }
    if (!username) { 
        showError('signup-username-error', 'Username is required'); 
        valid = false; 
    }
    if (!password || !validatePassword(password)) { 
        showError('signup-password-error', 'Password must be at least 6 characters'); 
        valid = false; 
    }
    if (!valid) return;

    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    if (users.some(u => u.username === username)) {
        showError('signup-username-error', 'Username already taken');
        return;
    }
    
    if (users.some(u => u.phone === phone)) {
        showError('signup-phone-error', 'Phone number already registered');
        return;
    }
    
    if (users.some(u => u.email === email)) {
        showError('signup-email-error', 'Email already registered');
        return;
    }

    const newUser = { 
        fullname, 
        phone, 
        email,
        username, 
        password, 
        address, 
        cart: [],
        reservations: [] 
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('loggedInUser', JSON.stringify(newUser));
    
    const signupSuccess = document.getElementById('signup-success');
    if (signupSuccess) {
        signupSuccess.textContent = 'Account created successfully! Redirecting...';
        signupSuccess.style.display = 'block';
    }
    setTimeout(() => window.location.href = 'index.html', 1500);
}

function initializeAdminUser() {
    const admins = JSON.parse(localStorage.getItem('adminUsers')) || [];
    if (!admins.some(u => u.username === 'admin')) {
        admins.push({
            username: "admin",
            password: "admin123",
            adminCode: "Rimuru123",
            fullname: "System Administrator",
            email: "admin@onlyatsham.com",
            phone: "1234567890"
        });
        localStorage.setItem('adminUsers', JSON.stringify(admins));
    }
}

/* ======================
   PASSWORD RESET FUNCTIONS
   ====================== */

function showForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    document.getElementById('forgot-password-step1').style.display = 'block';
    document.getElementById('forgot-password-step2').style.display = 'none';
    document.getElementById('forgot-password-step3').style.display = 'none';
    
    const phoneInput = document.getElementById('forgot-phone');
    if (phoneInput) phoneInput.value = '';
    
    hideError('forgot-phone-error');
    hideError('otp-error');
}

function closeModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.style.display = 'none';
}

function sendOTP() {
    const phone = document.getElementById('forgot-phone')?.value.trim();
    hideError('forgot-phone-error');

    if (!phone || !validatePhone(phone)) {
        return showError('forgot-phone-error', 'Please enter a valid phone number');
    }

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.phone === phone);
    
    if (!user) {
        return showError('forgot-phone-error', 'No account found with this phone number');
    }

    currentUserToReset = user;
    resetPhone = phone;
    currentOTP = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`OTP for ${phone}: ${currentOTP}`);
    
    const step1 = document.getElementById('forgot-password-step1');
    const step2 = document.getElementById('forgot-password-step2');
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'block';
    
    const phoneMask = document.getElementById('phone-mask');
    if (phoneMask) {
        const maskedPhone = phone.substring(0, 3) + '****' + phone.substring(7);
        phoneMask.textContent = maskedPhone;
    }
    
    const firstOtpInput = document.querySelector('.otp-input');
    if (firstOtpInput) firstOtpInput.focus();
    setupOTPInputs();
}

function setupOTPInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach(input => {
        input.value = '';
        input.addEventListener('input', function(e) {
            if (this.value.length === 1) {
                const nextIndex = parseInt(this.dataset.index) + 1;
                const nextInput = document.querySelector(`.otp-input[data-index="${nextIndex}"]`);
                if (nextInput) nextInput.focus();
            }
        });
        
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value.length === 0) {
                const prevIndex = parseInt(this.dataset.index) - 1;
                const prevInput = document.querySelector(`.otp-input[data-index="${prevIndex}"]`);
                if (prevInput) prevInput.focus();
            }
        });
    });
}

function verifyOTP() {
    const otpInputs = document.querySelectorAll('.otp-input');
    let enteredOTP = '';
    
    otpInputs.forEach(input => {
        enteredOTP += input.value;
    });
    
    hideError('otp-error');
    
    if (enteredOTP.length !== 6) {
        return showError('otp-error', 'Please enter the full 6-digit OTP');
    }
    
    if (enteredOTP !== currentOTP) {
        return showError('otp-error', 'Invalid OTP. Please try again');
    }
    
    const step2 = document.getElementById('forgot-password-step2');
    const step3 = document.getElementById('forgot-password-step3');
    if (step2) step2.style.display = 'none';
    if (step3) step3.style.display = 'block';
}

function resendOTP() {
    currentOTP = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`New OTP for ${resetPhone}: ${currentOTP}`);
    
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach(input => input.value = '');
    if (otpInputs[0]) otpInputs[0].focus();
    
    hideError('otp-error');
}

function resetPassword() {
    const newPassword = document.getElementById('new-password')?.value.trim();
    const confirmPassword = document.getElementById('confirm-password')?.value.trim();
    
    hideError('new-password-error');
    hideError('confirm-password-error');
    
    if (!newPassword || !validatePassword(newPassword)) {
        return showError('new-password-error', 'Password must be at least 6 characters');
    }
    
    if (newPassword !== confirmPassword) {
        return showError('confirm-password-error', 'Passwords do not match');
    }
    
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.phone === resetPhone);
    
    if (userIndex !== -1) {
        users[userIndex].password = newPassword;
        localStorage.setItem('users', JSON.stringify(users));
        alert('Password reset successfully! You can now login with your new password.');
        closeModal();
    } else {
        alert('Error updating password. Please try again.');
    }
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
 * @param {string} status - The status of the reservation ('pending' or 'reserved')
 */
function addToCart(productId, size, status = 'pending') {
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
            users[userIndex].cart[existingItemIndex].status = status;
            users[userIndex].cart[existingItemIndex].reservedAt = new Date().toISOString();
        } else {
            // Add new item to cart
            users[userIndex].cart.push({
                productId,
                name: product.name,
                price: product.price,
                image: product.image || 'assets/default-product.jpg',
                size,
                quantity: 1,
                status: status,
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
            button.textContent = status === 'reserved' ? 'Reserved!' : 'Added!';
            button.style.backgroundColor = status === 'reserved' ? '#2196F3' : '#4CAF50';
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
            window.location.href = 'cart.html';
        });
    }
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
   INITIALIZATION
   ====================== */

/**
 * Initializes all functionality when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Initialize general utilities
        initSmoothScrolling();
        initQuickView();
        
        // Initialize cart and reservation functionality
        setupLoginLogout();
        setupAddToCartButtons();
        
        // Initialize countdown timer if it exists
        if (typeof initCountdownTimer === 'function') {
            initCountdownTimer();
        }
        
        // Initialize admin user if on login page
        if (window.location.pathname.includes('login.html')) {
            initializeAdminUser();
            
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('banned') === 'true') {
                const loginUsername = document.getElementById('login-username');
                if (loginUsername) loginUsername.value = '';
                showError('login-password-error', 'Your account has been banned by admin');
            }
            
            if (localStorage.getItem('loggedInUser') || localStorage.getItem('loggedInAdmin')) {
                window.location.href = localStorage.getItem('loggedInAdmin') ? 'admin-dashboard.html' : 'index.html';
                return;
            }
            
            const adminCodeGroup = document.getElementById('admin-code-group');
            if (adminCodeGroup) adminCodeGroup.style.display = 'none';
            
            const loginUsernameInput = document.getElementById('login-username');
            if (loginUsernameInput) {
                loginUsernameInput.addEventListener('input', function() {
                    const adminCodeGroup = document.getElementById('admin-code-group');
                    if (adminCodeGroup) {
                        adminCodeGroup.style.display = this.value.trim().toLowerCase() === 'admin' ? 'block' : 'none';
                    }
                });
            }
            
            const forgotPasswordModal = document.getElementById('forgotPasswordModal');
            if (forgotPasswordModal) {
                forgotPasswordModal.addEventListener('click', function(e) {
                    if (e.target === this) closeModal();
                });
            }
        }
        
        // Load flash sale if on index page
        if (window.location.pathname.includes('index.html')) {
            loadFlashSale();
        }
    } catch (error) {
        console.error('Error initializing application:', error);
    }
});

// Listen for flash sale updates from admin
window.addEventListener('storage', function(e) {
    if (e.key === 'flashSales') {
        loadFlashSale();
    }
});