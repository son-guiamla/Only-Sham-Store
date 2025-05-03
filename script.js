// DOM Elements
const featuredProductsGrid = document.getElementById('featuredProducts');
const mainProductsGrid = document.getElementById('mainProducts');
const authBtn = document.getElementById('authBtn');
const cartBtn = document.getElementById('cartBtn');
const authModal = document.getElementById('authModal');
const closeBtn = document.querySelector('.close-btn');
const currentYear = document.getElementById('currentYear');
const categoryLinks = document.querySelectorAll('.categories a');
const productSearch = document.getElementById('productSearch');
const categoryFilter = document.getElementById('categoryFilter');
const priceRange = document.getElementById('priceRange');
const priceValue = document.getElementById('priceValue');
const profileBtn = document.getElementById('profileBtn');

// Current user state
let currentUser = null;
let products = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    currentYear.textContent = new Date().getFullYear();
    
    // Check if user is logged in
    checkAuthStatus();
    
    // Load products
    loadProducts();
    
    // Event listeners
    authBtn.addEventListener('click', openAuthModal);
    closeBtn.addEventListener('click', closeAuthModal);
    
    // Category filtering
    categoryLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            categoryLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            filterProducts();
        });
    });
    
    // Product filtering
    productSearch.addEventListener('input', filterProducts);
    categoryFilter.addEventListener('change', filterProducts);
    priceRange.addEventListener('input', updatePriceFilter);
    
    // Profile button
    if (profileBtn) {
        profileBtn.addEventListener('click', openProfileModal);
    }
});

// Check authentication status
function checkAuthStatus() {
    // In a real app, you would check with the server
    if (localStorage.getItem('username')) {
        currentUser = {
            username: localStorage.getItem('username'),
            is_admin: localStorage.getItem('is_admin') === 'true'
        };
        
        updateAuthUI();
    }
}

// Update UI based on auth status
function updateAuthUI() {
    if (currentUser) {
        authBtn.innerHTML = `<i class="fas fa-user"></i> ${currentUser.username}`;
        
        // Add profile button if not already present
        if (!document.getElementById('profileBtn')) {
            const actionButtons = document.querySelector('.action-buttons');
            const profileBtn = document.createElement('button');
            profileBtn.id = 'profileBtn';
            profileBtn.className = 'profile-btn';
            profileBtn.innerHTML = '<i class="fas fa-user-circle"></i>';
            actionButtons.insertBefore(profileBtn, cartBtn);
            
            profileBtn.addEventListener('click', openProfileModal);
        }
    } else {
        authBtn.innerHTML = '<i class="fas fa-user"></i>';
        
        // Remove profile button if exists
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.remove();
        }
    }
}

// Load products from server
function loadProducts() {
    fetch('products.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                products = data.products;
                renderProducts();
            } else {
                console.error('Failed to load products:', data.message);
            }
        })
        .catch(error => {
            console.error('Error loading products:', error);
        });
}

// Render products
function renderProducts(filteredProducts = null) {
    const productsToRender = filteredProducts || products;
    
    // Clear existing products
    featuredProductsGrid.innerHTML = '';
    mainProductsGrid.innerHTML = '';
    
    if (productsToRender.length === 0) {
        mainProductsGrid.innerHTML = '<p class="no-products">No products found</p>';
        return;
    }
    
    // Render featured products (first 4)
    const featured = productsToRender.slice(0, 4);
    featured.forEach(product => {
        featuredProductsGrid.appendChild(createProductCard(product));
    });
    
    // Render all products
    productsToRender.forEach(product => {
        mainProductsGrid.appendChild(createProductCard(product));
    });
    
    // Add event listeners to add to cart buttons
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!currentUser) {
                openAuthModal();
                return;
            }
            
            addToCart(btn.dataset.id);
        });
    });
}

// Create product card element
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    card.innerHTML = `
        <div class="product-image">
            <img src="${product.image_path}" alt="${product.name}">
            ${product.is_on_sale ? '<span class="product-badge">Sale</span>' : ''}
        </div>
        <div class="product-info">
            <h3>${product.name}</h3>
            ${product.description ? `<p class="product-description">${product.description}</p>` : ''}
            <div class="product-price">
                ${product.is_on_sale 
                    ? `<span class="current-price">₱${product.sale_price.toFixed(2)}</span>
                       <span class="original-price">₱${product.price.toFixed(2)}</span>`
                    : `<span class="current-price">₱${product.price.toFixed(2)}</span>`}
            </div>
            <button class="btn btn-primary add-to-cart" data-id="${product.id}">Add to Cart</button>
        </div>
    `;
    
    return card;
}

// Filter products based on search, category and price
function filterProducts() {
    const searchTerm = productSearch.value.toLowerCase();
    const category = categoryFilter.value;
    const maxPrice = parseInt(priceRange.value);
    const activeCategoryLink = document.querySelector('.categories a.active');
    const activeCategory = activeCategoryLink ? activeCategoryLink.dataset.category : 'all';
    
    const filtered = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) || 
                            (product.description && product.description.toLowerCase().includes(searchTerm));
        const matchesCategory = (category === 'all' || product.category === category) && 
                              (activeCategory === 'all' || product.category === activeCategory);
        const matchesPrice = product.is_on_sale 
            ? product.sale_price <= maxPrice 
            : product.price <= maxPrice;
        
        return matchesSearch && matchesCategory && matchesPrice;
    });
    
    renderProducts(filtered);
}

// Update price range display
function updatePriceFilter() {
    priceValue.textContent = `0 - ${priceRange.value}`;
    filterProducts();
}

// Add product to cart
function addToCart(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;
    
    // In a real app, you would send this to the server
    console.log('Adding to cart:', product);
    alert(`${product.name} added to cart`);
    
    // Update cart count
    updateCartCount();
}

// Update cart count in header
function updateCartCount() {
    // In a real app, you would get this from the server
    const count = 1; // Simplified for this example
    document.querySelector('.cart-count').textContent = count;
}

// Auth modal functions
function openAuthModal() {
    authModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
    authModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Profile modal functions
function openProfileModal() {
    // In a real app, you would fetch user data and show a modal
    window.location.href = 'profile.html';
}