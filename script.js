import { 
    setupLoginLogout as setupAuthLoginLogout,
    updateCartCount as updateAuthCartCount,
    isLoggedIn,
    getAuthToken
} from './auth.js';

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
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * Initializes mobile menu functionality
 */
function initMobileMenu() {
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const navMenu = document.getElementById('main-nav');
    
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            menuToggle.classList.toggle('open');
        });
    }
}

/* ======================
   MODAL FUNCTIONS
   ====================== */

/**
 * Initializes all modal functionality
 */
function initModals() {
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this);
            }
        });
    });
    
    // Close buttons
    document.querySelectorAll('.modal .close').forEach(btn => {
        btn.addEventListener('click', function() {
            closeModal(this.closest('.modal'));
        });
    });
}

/**
 * Closes a modal and restores body scroll
 * @param {HTMLElement} modal - The modal element to close
 */
function closeModal(modal) {
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

/* ======================
   PRODUCT & CART FUNCTIONS
   ====================== */

// Track selected size in quick view
let selectedQuickViewSize = '';

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
 * Initializes quick view functionality
 */
function initQuickView() {
    // Close modal
    document.querySelector('.close-modal').addEventListener('click', () => {
        closeQuickView();
    });
    
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

/**
 * Closes the quick view modal
 */
function closeQuickView() {
    document.getElementById('productModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

/* ======================
   FLASH SALE FUNCTIONS
   ====================== */

/**
 * Loads and displays active flash sales
 */
function loadFlashSale() {
    const flashSales = JSON.parse(localStorage.getItem('flashSales')) || [];
    const now = new Date();
    
    // Find active flash sales
    const activeFlashSales = flashSales.filter(sale => {
        const start = new Date(sale.startTime);
        const end = new Date(sale.endTime);
        return now >= start && now <= end;
    });
    
    const container = document.getElementById('flash-sale-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (activeFlashSales.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    // Display the first active flash sale
    const sale = activeFlashSales[0];
    const end = new Date(sale.endTime);
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

document.addEventListener('DOMContentLoaded', function() {
    try {
        // Initialize general utilities
        initSmoothScrolling();
        initMobileMenu();
        initModals();
        initQuickView();
        
        // Initialize auth-related functionality
        setupAuthLoginLogout();
        updateAuthCartCount();
        
        // Initialize flash sale
        loadFlashSale();
        
        // Listen for flash sale updates
        window.addEventListener('storage', function(e) {
            if (e.key === 'flashSales') {
                loadFlashSale();
            }
        });
    } catch (error) {
        console.error('Initialization error:', error);
    }
});

// Make functions available globally
window.toggleSidebar = toggleSidebar;
window.openQuickView = openQuickView;
window.closeQuickView = closeQuickView;