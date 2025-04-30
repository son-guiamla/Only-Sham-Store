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
    }
    
    // Load products with optional category filter
    loadProducts(category);
    updateCartCount();
    displayActiveFlashSales();
    
    // Listen for changes in cart
    window.addEventListener('storage', function(e) {
        if (e.key === 'cartUpdate') {
            updateCartCount();
        }
    });
});

async function loadProducts(category = null) {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;
    
    // Show loading state
    productGrid.innerHTML = '<div class="loading">Loading products...</div>';
    
    try {
        let url = 'products.php?action=';
        if (category) {
            url += `getByCategory&category=${encodeURIComponent(category)}`;
        } else if (window.location.pathname.includes('index.php')) {
            url += 'getFeatured';
        } else {
            url += 'getAll';
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load products');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to load products');
        
        const products = data.products || [];
        
        if (products.length === 0) {
            productGrid.innerHTML = '<div class="empty">No products available in this category</div>';
            return;
        }
        
        renderProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        productGrid.innerHTML = '<div class="empty">Error loading products. Please try again.</div>';
    }
}

function renderProducts(products) {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;
    
    productGrid.innerHTML = '';
    
    products.forEach((product, index) => {
        const sizes = product.sizes ? product.sizes.filter(size => size.quantity > 0).map(size => size.size) : [];
        const totalQuantity = product.sizes ? 
            product.sizes.reduce((sum, size) => sum + (size.quantity || 0), 0) : 0;
        
        // Build price display with proper discount information
        let priceDisplay = '';
        if (product.original_price) {
            const discountPercentage = Math.round((1 - (product.price / product.original_price)) * 100);
            priceDisplay = `
                <p class="original-price">₱${product.original_price.toFixed(2)}</p>
                <p class="price discounted">₱${product.price.toFixed(2)} 
                    <span class="discount-badge ${product.discount ? 'flashsale' : ''}">
                        ${product.discount ? `${discountPercentage}% OFF` : ''}
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
                ${product.original_price ? '<span class="discount-flag">SALE</span>' : ''}
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

async function addToCart(productId, size) {
    try {
        // Check if user is logged in
        const response = await fetch('auth.php?action=check');
        if (!response.ok) throw new Error('Failed to check auth status');
        
        const data = await response.json();
        if (!data.logged_in) {
            const confirmLogin = confirm('You need to login to add items to cart. Would you like to login now?');
            if (confirmLogin) {
                window.location.href = 'login.php';
            }
            return;
        }
        
        // Make API call to add to cart
        const addResponse = await fetch('cart.php?action=add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: productId,
                size: size,
                quantity: 1
            })
        });
        
        if (!addResponse.ok) throw new Error('Failed to add to cart');
        
        const addData = await addResponse.json();
        if (!addData.success) throw new Error(addData.error || 'Failed to add to cart');
        
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
        alert(error.message || 'An error occurred while adding to cart');
    }
}

async function updateCartCount() {
    try {
        const response = await fetch('cart.php?action=count');
        if (!response.ok) throw new Error('Failed to get cart count');
        
        const data = await response.json();
        const cartCountElements = document.querySelectorAll('#cart-count');
        
        cartCountElements.forEach(element => {
            element.textContent = data.count || 0;
        });
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
}

async function displayActiveFlashSales() {
    try {
        const response = await fetch('flash_sales.php?action=getActive');
        if (!response.ok) throw new Error('Failed to load flash sales');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to load flash sales');
        
        const activeSales = data.sales || [];
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

async function openQuickView(productId) {
    try {
        const response = await fetch(`products.php?action=getById&id=${productId}`);
        if (!response.ok) throw new Error('Failed to load product');
        
        const data = await response.json();
        if (!data.success || !data.product) throw new Error('Product not found');
        
        const product = data.product;
        
        // Show quick view modal with product details
        document.getElementById('modalProductTitle').textContent = product.name;
        document.getElementById('modalProductImage').src = product.image || 'assets/default-product.jpg';
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
                if (size.quantity > 0) {
                    const sizeOption = document.createElement('div');
                    sizeOption.className = 'size-option';
                    sizeOption.textContent = size.size;
                    sizeOption.setAttribute('data-size', size.size);
                    sizeOption.addEventListener('click', function() {
                        document.querySelectorAll('#quickViewSizes .size-option').forEach(opt => {
                            opt.classList.remove('selected');
                        });
                        this.classList.add('selected');
                        selectedQuickViewSize = size.size;
                    });
                    
                    // Select first available size by default
                    if (selectedQuickViewSize === '' && size.quantity > 0) {
                        sizeOption.classList.add('selected');
                        selectedQuickViewSize = size.size;
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
        console.error('Error loading product for quick view:', error);
        alert('An error occurred while loading the product details');
    }
}