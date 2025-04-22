document.addEventListener('DOMContentLoaded', function() {
    // Get the current page's category
    const path = window.location.pathname;
    let category = null;
    
    if (path.includes('t-shirts.html')) {
        category = 'T-Shirts';
    } else if (path.includes('jeans.html')) {
        category = 'Jeans';
    } else if (path.includes('shoes.html')) {
        category = 'Shoes';
    } else if (path.includes('shorts.html')) {
        category = 'Shorts';
    } else if (path.includes('index.html')) {
        // For main shop page, we'll handle featured products separately
        category = null;
    }
    
    // Initialize default products if none exist
    initializeDefaultProducts();
    
    // Load products with optional category filter
    loadProducts(category);
    updateCartCount();
    setupLoginLogout();
    displayActiveFlashSales();
    
    // Listen for changes in products data
    window.addEventListener('storage', function(e) {
        if (e.key === 'products' || e.key === 'flashSales') {
            loadProducts(category);
            displayActiveFlashSales();
        }
    });
});

function loadProducts(category = null) {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;
    
    try {
        let products = JSON.parse(localStorage.getItem('products')) || [];
        
        // Filter out deleted products
        products = products.filter(product => !product.deleted);
        
        // Filter by category if specified (not on main shop page)
        if (category && !window.location.pathname.includes('index.html')) {
            products = products.filter(product => product.category === category);
        } else if (window.location.pathname.includes('index.html')) {
            // For main shop page, show featured products only
            products = products.filter(product => product.featured);
        }
        
        // Apply any active discounts
        products = applyDiscounts(products);
        
        if (products.length === 0) {
            productGrid.innerHTML = `<div class="empty">No products available in this category</div>`;
            return;
        }
        
        renderProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        productGrid.innerHTML = `<div class="empty">Error loading products. Please try again.</div>`;
    }
}

function initializeDefaultProducts() {
    try {
        let products = JSON.parse(localStorage.getItem('products'));
        
        // If no products exist or it's not an array, create default products
        if (!products || !Array.isArray(products)) {
            products = [
                {
                    id: 'prod1',
                    name: 'Classic White T-Shirt',
                    price: 299.99,
                    category: 'T-Shirts',
                    image: 'assets/Shirt.png',
                    sizes: { 'S': 10, 'M': 15, 'L': 8, 'XL': 5 },
                    description: 'A comfortable classic white t-shirt',
                    featured: true,
                    deleted: false
                },
                {
                    id: 'prod2',
                    name: 'Slim Fit Jeans',
                    price: 799.99,
                    category: 'Jeans',
                    image: 'assets/jeans.svg',
                    sizes: { '28': 5, '30': 8, '32': 10, '34': 7 },
                    description: 'Modern slim fit jeans',
                    featured: true,
                    deleted: false
                }
            ];
            
            localStorage.setItem('products', JSON.stringify(products));
        }
    } catch (error) {
        console.error('Error initializing default products:', error);
    }
}

function applyDiscounts(products) {
    try {
        const flashSales = JSON.parse(localStorage.getItem('flashSales')) || [];
        const now = new Date();
        
        // Get active flash sales
        const activeFlashSales = flashSales.filter(sale => {
            const start = new Date(sale.startTime);
            const end = new Date(sale.endTime);
            return now >= start && now <= end;
        });

        // If no active flash sales, return original products
        if (activeFlashSales.length === 0) return products;

        return products.map(product => {
            let bestDiscount = 0;
            let discountType = '';
            let discountText = '';
            
            // Check all active flash sales for this product
            activeFlashSales.forEach(sale => {
                let isIncluded = false;
                
                if (sale.scope === 'products' && sale.products) {
                    isIncluded = sale.products.includes(product.id);
                } else if (sale.scope === 'categories' && sale.categories) {
                    isIncluded = sale.categories.includes(product.category);
                } else if (sale.scope === 'all') {
                    isIncluded = true;
                }
                
                if (isIncluded) {
                    const discountValue = sale.discountValue;
                    if (discountValue > bestDiscount) {
                        bestDiscount = discountValue;
                        discountType = sale.discountType;
                        discountText = sale.name || 'FLASH SALE';
                    }
                }
            });
            
            // Apply the best discount found
            if (bestDiscount > 0) {
                const discountedProduct = {...product};
                discountedProduct.originalPrice = product.price;
                
                if (discountType === 'percentage') {
                    discountedProduct.price = product.price * (1 - (bestDiscount / 100));
                    discountedProduct.discountText = discountText;
                } else {
                    discountedProduct.price = Math.max(0, product.price - bestDiscount);
                    discountedProduct.discountText = discountText;
                }
                
                discountedProduct.discountSource = 'flashsale';
                return discountedProduct;
            }
            
            return product;
        });
    } catch (error) {
        console.error('Error applying discounts:', error);
        return products;
    }
}

function renderProducts(products) {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;
    
    productGrid.innerHTML = '';
    
    products.forEach((product, index) => {
        const sizes = product.sizes ? Object.keys(product.sizes).filter(size => product.sizes[size] > 0) : [];
        const totalQuantity = product.sizes ? 
            Object.values(product.sizes).reduce((sum, qty) => sum + (qty || 0), 0) : 0;
        
        // Build price display with proper discount information
        let priceDisplay = '';
        if (product.originalPrice) {
            const discountPercentage = Math.round((1 - (product.price / product.originalPrice)) * 100);
            priceDisplay = `
                <p class="original-price">₱${product.originalPrice.toFixed(2)}</p>
                <p class="price discounted">₱${product.price.toFixed(2)} 
                    <span class="discount-badge ${product.discountSource === 'flashsale' ? 'flashsale' : ''}">
                        ${product.discountText || `${discountPercentage}% OFF`}
                    </span>
                </p>
            `;
        } else {
            priceDisplay = `<p class="price">₱${product.price.toFixed(2)}</p>`;
        }
        
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-image-container">
                <img src="${product.image || 'assets/default-product.jpg'}" 
                     alt="${product.name}" 
                     class="product-image"
                     onerror="this.onerror=null;this.src='assets/default-product.jpg'">
                ${product.featured ? '<span class="featured-badge">Featured</span>' : ''}
                ${product.originalPrice ? '<span class="discount-flag">SALE</span>' : ''}
                <button class="quick-view-btn" data-id="${product.id}">
                    <i class="fas fa-eye"></i> Quick View
                </button>
            </div>
            <h3>${product.name}</h3>
            ${priceDisplay}
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
    
    // Add event listeners to all add-to-cart buttons
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            const productCard = this.closest('.product-card');
            const sizeSelect = productCard.querySelector('.size-dropdown');
            const size = sizeSelect ? sizeSelect.value : 'S';
            addToCart(productId, size);
        });
    });
    
    // Add event listeners to quick view buttons
    document.querySelectorAll('.quick-view-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const productId = this.getAttribute('data-id');
            openQuickView(productId);
        });
    });
}

function displayActiveFlashSales() {
    try {
        const flashSales = JSON.parse(localStorage.getItem('flashSales')) || [];
        const now = new Date();
        
        // Filter active flash sales
        const activeSales = flashSales.filter(sale => {
            const start = new Date(sale.startTime);
            const end = new Date(sale.endTime);
            return now >= start && now <= end;
        });
        
        const flashSaleContainer = document.getElementById('flash-sale-container');
        if (!flashSaleContainer) return;
        
        if (activeSales.length === 0) {
            flashSaleContainer.innerHTML = `
                <div class="no-flash-sale">
                    <h3>No Active Flash Sales</h3>
                    <p>Check back later for exciting deals!</p>
                </div>
            `;
            return;
        }
        
        // For each active sale, create a banner
        let html = '';
        activeSales.forEach(sale => {
            const endDate = new Date(sale.endTime);
            const timeLeft = endDate - now;
            
            html += `
                <div class="flash-sale-active" data-end="${sale.endTime}">
                    <h1>${sale.name}</h1>
                    <h2>${sale.discountType === 'percentage' ? 
                        `${sale.discountValue}% OFF` : 
                        `₱${sale.discountValue} OFF`}</h2>
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
                    <a href="#shop" class="shop-now-btn">Shop Now</a>
                </div>
            `;
        });
        
        flashSaleContainer.innerHTML = html;
        
        // Initialize countdown timers
        initializeCountdownTimers();
    } catch (error) {
        console.error('Error displaying flash sales:', error);
    }
}

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