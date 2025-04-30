// Admin Dashboard Script
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Check if admin is logged in
        const loggedInAdmin = JSON.parse(localStorage.getItem('loggedInAdmin'));
        if (!loggedInAdmin) {
            window.location.href = 'login.html';
            return;
        }

        // Navigation
        const navLinks = document.querySelectorAll('.sidebar-menu a');
        const sections = document.querySelectorAll('[id$="-section"]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const sectionId = this.dataset.section + '-section';
                
                // Update active link
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                
                // Show selected section
                sections.forEach(section => {
                    section.style.display = 'none';
                });
                document.getElementById(sectionId).style.display = 'block';
                
                // Refresh section data when clicked
                switch(this.dataset.section) {
                    case 'dashboard':
                        loadDashboardData();
                        break;
                    case 'products':
                        loadProducts();
                        break;
                    case 'reservations':
                        loadReservations();
                        break;
                    case 'users':
                        loadUsers();
                        break;
                    case 'feedback':
                        loadFeedback();
                        break;
                    case 'orders':
                        loadOrderHistory();
                        break;
                    case 'flashsales':
                        loadFlashSales();
                        break;
                }
            });
        });

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                localStorage.removeItem('loggedInAdmin');
                window.location.href = 'login.html';
            });
        }

        // Initialize dashboard
        loadDashboardData();

        // Modal functionality
        const modals = document.querySelectorAll('.admin-modal');
        const closeButtons = document.querySelectorAll('.admin-close-btn');
        
        // Open product modal
        const addProductBtn = document.getElementById('add-product-btn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', function() {
                document.getElementById('product-modal-title').textContent = 'Add New Product';
                document.getElementById('product-form').reset();
                document.getElementById('product-id').value = '';
                document.getElementById('image-preview').innerHTML = '';
                document.querySelector('.admin-size-quantities').innerHTML = '';
                addSizeInput();
                document.getElementById('product-modal').style.display = 'flex';
            });
        }
        
        // Close modals
        closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                modals.forEach(modal => modal.style.display = 'none');
            });
        });
        
        // Close modal when clicking outside
        modals.forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Form submissions
        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.addEventListener('submit', function(e) {
                e.preventDefault();
                saveProduct();
            });
        }

        // Add size button
        const addSizeBtn = document.getElementById('add-size-btn');
        if (addSizeBtn) {
            addSizeBtn.addEventListener('click', function() {
                addSizeInput();
            });
        }

        // Flash Sale Modal functionality
        const addFlashsaleBtn = document.getElementById('add-flashsale-btn');
        if (addFlashsaleBtn) {
            addFlashsaleBtn.addEventListener('click', function() {
                document.getElementById('flashsale-modal-title').textContent = 'Create Flash Sale';
                document.getElementById('flashsale-form').reset();
                document.getElementById('flashsale-id').value = '';
                document.getElementById('products-selector').style.display = 'none';
                document.getElementById('categories-selector').style.display = 'none';
                document.getElementById('flashsale-modal').style.display = 'flex';
                loadFlashSaleProductOptions();
                loadFlashSaleCategoryOptions();
            });
        }

        // Flash Sale form submission
        const flashsaleForm = document.getElementById('flashsale-form');
        if (flashsaleForm) {
            flashsaleForm.addEventListener('submit', function(e) {
                e.preventDefault();
                saveFlashSale();
            });
        }

        // Flash Sale scope change listener
        const flashsaleScope = document.getElementById('flashsale-scope');
        if (flashsaleScope) {
            flashsaleScope.addEventListener('change', function() {
                const scope = this.value;
                document.getElementById('products-selector').style.display = scope === 'products' ? 'block' : 'none';
                document.getElementById('categories-selector').style.display = scope === 'categories' ? 'block' : 'none';
            });
        }

        // Flash Sale discount type change listener
        const flashsaleDiscountType = document.getElementById('flashsale-discount-type');
        if (flashsaleDiscountType) {
            flashsaleDiscountType.addEventListener('change', function() {
                document.getElementById('discount-symbol').textContent = this.value === 'percentage' ? '%' : '₱';
            });
        }
    } catch (error) {
        console.error('Initialization error:', error);
        alert('An error occurred during initialization. Please refresh the page.');
    }
});

// Dashboard functions
function loadDashboardData() {
    try {
        // Load products
        const products = JSON.parse(localStorage.getItem('products')) || [];
        const totalProductsEl = document.getElementById('total-products');
        if (totalProductsEl) {
            totalProductsEl.textContent = products.filter(p => !p.deleted).length;
        }
        
        // Load users
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const totalUsersEl = document.getElementById('total-users');
        if (totalUsersEl) {
            totalUsersEl.textContent = users.length;
        }
        
        // Load reservations and calculate revenue
        let activeReservations = 0;
        let totalRevenue = 0;
        let pickedItemsCount = 0;
        
        users.forEach(user => {
            // Count picked items
            if (user.pickedItems) {
                pickedItemsCount += user.pickedItems.length;
                user.pickedItems.forEach(item => {
                    totalRevenue += item.price * item.quantity;
                });
            }
            
            // Count active reservations
            if (user.cart) {
                user.cart.forEach(reservation => {
                    if (reservation.status === 'reserved' || reservation.status === 'confirmed') {
                        activeReservations++;
                        totalRevenue += reservation.price * reservation.quantity;
                    }
                });
            }
        });
        
        const activeReservationsEl = document.getElementById('active-reservations');
        if (activeReservationsEl) {
            activeReservationsEl.textContent = activeReservations;
        }
        
        const pickedOrdersEl = document.getElementById('picked-orders');
        if (pickedOrdersEl) {
            pickedOrdersEl.textContent = pickedItemsCount;
        }
        
        const totalRevenueEl = document.getElementById('total-revenue');
        if (totalRevenueEl) {
            totalRevenueEl.textContent = `₱${totalRevenue.toFixed(2)}`;
        }
        
        // Initialize charts
        initCharts(users);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function initCharts(users) {
    try {
        // Sales chart
        const salesData = getSalesData(users);
        const salesCtx = document.getElementById('salesChart')?.getContext('2d');
        
        if (salesCtx) {
            new Chart(salesCtx, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                        label: 'Sales',
                        data: salesData,
                        backgroundColor: 'rgba(74, 107, 255, 0.2)',
                        borderColor: 'rgba(74, 107, 255, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        
        // Reservation status chart
        const statusData = getReservationStatusData(users);
        const statusCtx = document.getElementById('reservationStatusChart')?.getContext('2d');
        
        if (statusCtx) {
            new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Pending', 'Reserved', 'Confirmed', 'Picked', 'Expired'],
                    datasets: [{
                        data: statusData,
                        backgroundColor: [
                            'rgba(255, 206, 86, 0.2)',
                            'rgba(75, 192, 192, 0.2)',
                            'rgba(54, 162, 235, 0.2)',
                            'rgba(153, 102, 255, 0.2)',
                            'rgba(255, 99, 132, 0.2)'
                        ],
                        borderColor: [
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 99, 132, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}

function getSalesData(users) {
    const monthlySales = Array(12).fill(0);
    const now = new Date();
    const currentYear = now.getFullYear();
    
    users.forEach(user => {
        // Process picked items (completed sales)
        if (user.pickedItems) {
            user.pickedItems.forEach(item => {
                if (item.pickedAt) {
                    const date = new Date(item.pickedAt);
                    if (date.getFullYear() === currentYear) {
                        const month = date.getMonth();
                        monthlySales[month] += item.price * item.quantity;
                    }
                }
            });
        }
        
        // Process confirmed reservations (potential sales)
        if (user.cart) {
            user.cart.forEach(item => {
                if (item.status === 'confirmed' && item.reservedAt) {
                    const date = new Date(item.reservedAt);
                    if (date.getFullYear() === currentYear) {
                        const month = date.getMonth();
                        monthlySales[month] += item.price * item.quantity;
                    }
                }
            });
        }
    });
    
    return monthlySales;
}

function getReservationStatusData(users) {
    const statusCounts = {
        pending: 0,
        reserved: 0,
        confirmed: 0,
        picked: 0,
        expired: 0
    };
    
    const now = new Date();
    
    users.forEach(user => {
        // Count picked items
        if (user.pickedItems) {
            statusCounts.picked += user.pickedItems.length;
        }
        
        // Count cart items
        if (user.cart) {
            user.cart.forEach(item => {
                if (!item.status || item.status === 'pending') {
                    statusCounts.pending++;
                } else if (item.status === 'reserved') {
                    statusCounts.reserved++;
                } else if (item.status === 'confirmed') {
                    statusCounts.confirmed++;
                }
                
                // Check for expired reservations
                if (item.reservedAt && (item.status === 'reserved' || item.status === 'confirmed')) {
                    const expiryDate = new Date(item.reservedAt);
                    expiryDate.setDate(expiryDate.getDate() + 3);
                    if (expiryDate < now) {
                        statusCounts.expired++;
                    }
                }
            });
        }
    });
    
    return [
        statusCounts.pending,
        statusCounts.reserved,
        statusCounts.confirmed,
        statusCounts.picked,
        statusCounts.expired
    ];
}

// Load feedback data
function loadFeedback() {
    try {
        const feedbackList = JSON.parse(localStorage.getItem('shopReviews')) || [];
        const tbody = document.querySelector('#feedback-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        feedbackList.forEach((feedback, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${feedback.username}</td>
                <td><img src="${feedback.profilePicture || 'assets/default-profile.png'}" alt="${feedback.username}" width="50" style="border-radius: 50%;"></td>
                <td>${'★'.repeat(feedback.rating)}${'☆'.repeat(5 - feedback.rating)}</td>
                <td>${feedback.comment}</td>
                <td>${new Date(feedback.date).toLocaleDateString()}</td>
                <td>
                    <button class="admin-action-btn admin-delete-btn" data-id="${index}"><i class="fas fa-trash"></i> <span>Delete</span></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Add event listeners to delete buttons
        document.querySelectorAll('.admin-delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteFeedback(parseInt(this.dataset.id));
            });
        });
    } catch (error) {
        console.error('Error loading feedback:', error);
    }
}

// Delete feedback
function deleteFeedback(id) {
    if (confirm('Are you sure you want to delete this feedback?')) {
        try {
            const feedbackList = JSON.parse(localStorage.getItem('shopReviews')) || [];
            feedbackList.splice(id, 1);
            localStorage.setItem('shopReviews', JSON.stringify(feedbackList));
            loadFeedback();
        } catch (error) {
            console.error('Error deleting feedback:', error);
        }
    }
}

// Product management
function loadProducts() {
    try {
        const products = JSON.parse(localStorage.getItem('products')) || [];
        const tbody = document.querySelector('#products-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        products.forEach((product, index) => {
            // Skip deleted products in display
            if (product.deleted) return;
            
            // Format sizes for display
            let sizesDisplay = 'No sizes';
            if (product.sizes) {
                sizesDisplay = Object.entries(product.sizes)
                    .map(([size, qty]) => `${size}: ${qty}`)
                    .join(', ');
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${product.image || 'assets/default-product.jpg'}" alt="${product.name}" width="50"></td>
                <td>${product.name}</td>
                <td>₱${product.price.toFixed(2)}</td>
                <td>${product.category || 'N/A'}</td>
                <td>${sizesDisplay}</td>
                <td>
                    <button class="admin-action-btn admin-edit-btn" data-id="${index}"><i class="fas fa-edit"></i> <span>Edit</span></button>
                    <button class="admin-action-btn admin-delete-btn" data-id="${index}"><i class="fas fa-trash"></i> <span>Delete</span></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        // Add event listeners to edit/delete buttons
        document.querySelectorAll('.admin-edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                editProduct(parseInt(this.dataset.id));
            });
        });
        
        document.querySelectorAll('.admin-delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteProduct(parseInt(this.dataset.id));
            });
        });
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function editProduct(id) {
    try {
        const products = JSON.parse(localStorage.getItem('products')) || [];
        const product = products[id];
        
        if (product) {
            document.getElementById('product-modal-title').textContent = 'Edit Product';
            document.getElementById('product-id').value = id;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-category').value = product.category || 'T-Shirts';
            document.getElementById('product-description').value = product.description || '';
            document.getElementById('product-featured').checked = product.featured || false;
            
            // Display current image
            const imagePreview = document.getElementById('image-preview');
            if (product.image && imagePreview) {
                imagePreview.innerHTML = `<img src="${product.image}" alt="Current Image" style="max-width: 100px; max-height: 100px;">`;
            } else if (imagePreview) {
                imagePreview.innerHTML = '';
            }
            
            // Clear existing size inputs
            const sizeContainer = document.querySelector('.admin-size-quantities');
            if (sizeContainer) {
                sizeContainer.innerHTML = '';
                
                // Add size inputs for each size in the product
                if (product.sizes) {
                    for (const [size, quantity] of Object.entries(product.sizes)) {
                        addSizeInput(size, quantity);
                    }
                } else {
                    // Default to empty if no sizes exist
                    addSizeInput('S', 0);
                }
            }
            
            document.getElementById('product-modal').style.display = 'flex';
        }
    } catch (error) {
        console.error('Error editing product:', error);
    }
}

// Add size input row to the form
function addSizeInput(size = 'S', quantity = 0) {
    const sizeContainer = document.querySelector('.admin-size-quantities');
    if (!sizeContainer) return;
    
    const row = document.createElement('div');
    row.className = 'admin-size-quantity-row';
    row.innerHTML = `
        <select class="admin-size-select">
            <option value="S" ${size === 'S' ? 'selected' : ''}>Small (S)</option>
            <option value="M" ${size === 'M' ? 'selected' : ''}>Medium (M)</option>
            <option value="L" ${size === 'L' ? 'selected' : ''}>Large (L)</option>
            <option value="XL" ${size === 'XL' ? 'selected' : ''}>Extra Large (XL)</option>
        </select>
        <input type="number" class="admin-size-quantity" min="0" value="${quantity}" required>
        <button type="button" class="admin-remove-size-btn"><i class="fas fa-times"></i></button>
    `;
    sizeContainer.appendChild(row);
    
    // Add event listener to remove button
    row.querySelector('.admin-remove-size-btn').addEventListener('click', function() {
        if (document.querySelectorAll('.admin-size-quantity-row').length > 1) {
            row.remove();
        } else {
            alert('At least one size is required');
        }
    });
}

// Save product data to localStorage
function saveProductData(id, name, price, imageUrl, description, category, featured, sizeQuantities, products) {
    try {
        if (id === '') {
            // Add new product
            const newProduct = {
                id: Date.now().toString(),
                name,
                price,
                image: imageUrl,
                description,
                category,
                featured,
                sizes: sizeQuantities,
                deleted: false
            };
            products.push(newProduct);
        } else {
            // Update existing product
            products[id] = {
                ...products[id],
                name,
                price,
                image: imageUrl,
                description,
                category,
                featured,
                sizes: sizeQuantities
            };
        }
        
        localStorage.setItem('products', JSON.stringify(products));
        document.getElementById('product-modal').style.display = 'none';
        loadProducts();
        
        // Dispatch event to notify other pages of product changes
        window.dispatchEvent(new Event('storage'));
    } catch (error) {
        console.error('Error saving product data:', error);
        alert('An error occurred while saving the product data');
    }
}

function saveProduct() {
    try {
        const id = document.getElementById('product-id').value;
        const name = document.getElementById('product-name').value;
        const price = parseFloat(document.getElementById('product-price').value);
        const imageInput = document.getElementById('product-image');
        const description = document.getElementById('product-description').value;
        const category = document.getElementById('product-category').value;
        const featured = document.getElementById('product-featured').checked;
        
        // Validate inputs
        if (!name || isNaN(price) || price <= 0) {
            alert('Please enter valid product details (name and price are required)');
            return;
        }
        
        // Collect size quantities
        const sizeQuantities = {};
        const sizeRows = document.querySelectorAll('.admin-size-quantity-row');
        
        if (sizeRows.length === 0) {
            alert('Please add at least one size');
            return;
        }
        
        sizeRows.forEach(row => {
            const size = row.querySelector('.admin-size-select').value;
            const quantity = parseInt(row.querySelector('.admin-size-quantity').value) || 0;
            if (quantity < 0) {
                alert('Quantity cannot be negative');
                return;
            }
            sizeQuantities[size] = quantity;
        });

        const products = JSON.parse(localStorage.getItem('products')) || [];
        
        // Handle image upload
        if (imageInput.files && imageInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imageUrl = e.target.result;
                saveProductData(id, name, price, imageUrl, description, category, featured, sizeQuantities, products);
            };
            reader.onerror = function() {
                alert('Error reading image file');
            };
            reader.readAsDataURL(imageInput.files[0]);
        } else {
            // If no new image is uploaded, keep the existing one for edits
            let imageUrl = '';
            if (id !== '' && products[id] && products[id].image) {
                imageUrl = products[id].image;
            }
            saveProductData(id, name, price, imageUrl, description, category, featured, sizeQuantities, products);
        }
    } catch (error) {
        console.error('Error saving product:', error);
        alert('An error occurred while saving the product. Please check the console for details.');
    }
}

function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            const products = JSON.parse(localStorage.getItem('products')) || [];
            // Mark as deleted
            products[id].deleted = true;
            
            // Also remove from any active reservations
            const users = JSON.parse(localStorage.getItem('users')) || [];
            users.forEach(user => {
                if (user.cart) {
                    user.cart = user.cart.filter(item => item.productId !== products[id].id);
                }
            });
            
            localStorage.setItem('products', JSON.stringify(products));
            localStorage.setItem('users', JSON.stringify(users));
            
            loadProducts();
            window.dispatchEvent(new Event('storage'));
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    }
}

// Reservation management
function loadReservations() {
    try {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const tbody = document.querySelector('#reservations-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        users.forEach(user => {
            if (user.cart) {
                user.cart.forEach((reservation, index) => {
                    // Skip pending items (only show reserved/confirmed)
                    if (reservation.status === 'pending') return;
                    
                    const tr = document.createElement('tr');
                    const statusClass = reservation.status === 'confirmed' ? 'admin-status-confirmed' : 
                                      reservation.status === 'picked' ? 'admin-status-completed' : 'admin-status-reserved';
                    
                    // Check if reservation is expired
                    let isExpired = false;
                    if (reservation.reservedAt && (reservation.status === 'reserved' || reservation.status === 'confirmed')) {
                        const expiryDate = new Date(reservation.reservedAt);
                        expiryDate.setDate(expiryDate.getDate() + 3);
                        isExpired = expiryDate < new Date();
                    }
                    
                    tr.innerHTML = `
                        <td>${user.username}</td>
                        <td>${reservation.name}</td>
                        <td>${reservation.size}</td>
                        <td>${reservation.quantity}</td>
                        <td>₱${(reservation.price * reservation.quantity).toFixed(2)}</td>
                        <td><span class="admin-status ${statusClass} ${isExpired ? 'admin-status-expired' : ''}">
                            ${isExpired ? 'Expired' : (reservation.status || 'reserved')}
                        </span></td>
                        <td>${reservation.pickedAt ? new Date(reservation.pickedAt).toLocaleDateString() : 'N/A'}</td>
                        <td>
                            ${reservation.status === 'reserved' && !isExpired ? 
                                `<button class="admin-action-btn admin-confirm-btn" data-user="${user.username}" data-index="${index}">
                                    <i class="fas fa-check"></i> <span>Confirm</span>
                                </button>` : ''}
                            ${reservation.status !== 'picked' && !isExpired ? 
                                `<button class="admin-action-btn admin-complete-btn" data-user="${user.username}" data-index="${index}">
                                    <i class="fas fa-check-circle"></i> <span>Mark as Picked</span>
                                </button>` : ''}
                            <button class="admin-action-btn admin-delete-btn" data-user="${user.username}" data-index="${index}">
                                <i class="fas fa-trash"></i> <span>Delete</span>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        });
        
        // Add event listeners to buttons
        document.querySelectorAll('.admin-confirm-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                confirmReservation(this.dataset.user, parseInt(this.dataset.index));
            });
        });
        
        document.querySelectorAll('.admin-complete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                completeReservation(this.dataset.user, parseInt(this.dataset.index));
            });
        });
        
        document.querySelectorAll('.admin-delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteReservation(this.dataset.user, parseInt(this.dataset.index));
            });
        });
    } catch (error) {
        console.error('Error loading reservations:', error);
    }
}

function confirmReservation(username, reservationIndex) {
    try {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = users.findIndex(u => u.username === username);
        
        if (userIndex !== -1 && users[userIndex].cart[reservationIndex]) {
            users[userIndex].cart[reservationIndex].status = 'confirmed';
            localStorage.setItem('users', JSON.stringify(users));
            
            // Update loggedInUser if it's the current user
            const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
            if (loggedInUser && loggedInUser.username === username) {
                loggedInUser.cart = users[userIndex].cart;
                localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
            }
            
            loadReservations();
            window.dispatchEvent(new Event('storage'));
        }
    } catch (error) {
        console.error('Error confirming reservation:', error);
    }
}

function completeReservation(username, reservationIndex) {
    try {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = users.findIndex(u => u.username === username);
        
        if (userIndex !== -1 && users[userIndex].cart[reservationIndex]) {
            const reservation = users[userIndex].cart[reservationIndex];
            
            // Mark as picked
            reservation.status = 'picked';
            reservation.pickedAt = new Date().toISOString();
            
            // Move to picked items
            if (!users[userIndex].pickedItems) {
                users[userIndex].pickedItems = [];
            }
            users[userIndex].pickedItems.push(reservation);
            
            // Remove from cart
            users[userIndex].cart.splice(reservationIndex, 1);
            
            localStorage.setItem('users', JSON.stringify(users));
            
            // Update loggedInUser if it's the current user
            const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
            if (loggedInUser && loggedInUser.username === username) {
                loggedInUser.cart = users[userIndex].cart;
                if (!loggedInUser.pickedItems) {
                    loggedInUser.pickedItems = [];
                }
                loggedInUser.pickedItems.push(reservation);
                localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
            }
            
            loadReservations();
            loadOrderHistory();
            window.dispatchEvent(new Event('storage'));
        }
    } catch (error) {
        console.error('Error completing reservation:', error);
    }
}

function deleteReservation(username, reservationIndex) {
    if (!confirm('Are you sure you want to delete this reservation?')) return;
    
    try {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = users.findIndex(u => u.username === username);
        
        if (userIndex !== -1 && users[userIndex].cart[reservationIndex]) {
            const reservation = users[userIndex].cart[reservationIndex];
            
            // Restore product stock if not picked
            if (reservation.status !== 'picked') {
                const products = JSON.parse(localStorage.getItem('products')) || [];
                const productIndex = products.findIndex(p => p.id === reservation.productId);
                if (productIndex !== -1 && products[productIndex].sizes) {
                    products[productIndex].sizes[reservation.size] += reservation.quantity;
                    localStorage.setItem('products', JSON.stringify(products));
                }
            }
            
            // Remove reservation
            users[userIndex].cart.splice(reservationIndex, 1);
            localStorage.setItem('users', JSON.stringify(users));
            
            // Update loggedInUser if it's the current user
            const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
            if (loggedInUser && loggedInUser.username === username) {
                loggedInUser.cart = users[userIndex].cart;
                localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
            }
            
            loadReservations();
            window.dispatchEvent(new Event('storage'));
        }
    } catch (error) {
        console.error('Error deleting reservation:', error);
    }
}

function loadOrderHistory() {
    try {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const tbody = document.querySelector('#orders-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        users.forEach(user => {
            if (user.pickedItems && user.pickedItems.length > 0) {
                user.pickedItems.forEach((order, index) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${user.username}</td>
                        <td>${order.name}</td>
                        <td>${order.size}</td>
                        <td>${order.quantity}</td>
                        <td>₱${(order.price * order.quantity).toFixed(2)}</td>
                        <td><span class="admin-status admin-status-completed">Picked Up</span></td>
                        <td>${order.pickedAt ? new Date(order.pickedAt).toLocaleDateString() : 'N/A'}</td>
                        <td>
                            <button class="admin-action-btn admin-delete-btn" data-user="${user.username}" data-index="${index}">
                                <i class="fas fa-trash"></i> <span>Delete</span>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        });
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.admin-delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteOrder(this.dataset.user, parseInt(this.dataset.index));
            });
        });
    } catch (error) {
        console.error('Error loading order history:', error);
    }
}

function deleteOrder(username, orderIndex) {
    if (!confirm('Are you sure you want to delete this order record?')) return;
    
    try {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = users.findIndex(u => u.username === username);
        
        if (userIndex !== -1 && users[userIndex].pickedItems[orderIndex]) {
            users[userIndex].pickedItems.splice(orderIndex, 1);
            localStorage.setItem('users', JSON.stringify(users));
            
            // Update loggedInUser if it's the current user
            const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
            if (loggedInUser && loggedInUser.username === username) {
                loggedInUser.pickedItems = users[userIndex].pickedItems;
                localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
            }
            
            loadOrderHistory();
        }
    } catch (error) {
        console.error('Error deleting order:', error);
    }
}

// User management
function loadUsers() {
    try {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const tbody = document.querySelector('#users-table tbody');
        tbody.innerHTML = '';
        
        users.forEach((user, index) => {
            const reservationCount = user.cart ? user.cart.filter(item => item.status && item.status !== 'pending').length : 0;
            const pickedCount = user.pickedItems ? user.pickedItems.length : 0;
            const expiredCount = user.cart ? user.cart.filter(item => {
                if (item.reservedAt && (item.status === 'reserved' || item.status === 'confirmed')) {
                    const expiryDate = new Date(item.reservedAt);
                    expiryDate.setDate(expiryDate.getDate() + 3);
                    return expiryDate < new Date();
                }
                return false;
            }).length : 0;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.fullname || 'N/A'}</td>
                <td>${user.username}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>${reservationCount}</td>
                <td>${pickedCount}</td>
                <td>${expiredCount}</td>
                <td>
                    ${user.banned ? 
                        `<span class="admin-status admin-status-expired">Banned</span>
                         <small>${user.banReason || 'No reason'}</small>` : 
                        '<span class="admin-status admin-status-confirmed">Active</span>'}
                </td>
                <td>
                    <button class="admin-action-btn ${user.banned ? 'admin-confirm-btn' : 'admin-delete-btn'}" data-id="${index}" title="${user.banned ? 'Unban' : 'Ban'}">
                        <i class="fas ${user.banned ? 'fa-unlock' : 'fa-ban'}"></i> <span>${user.banned ? 'Unban' : 'Ban'}</span>
                    </button>
                    <button class="admin-action-btn admin-delete-btn" data-id="${index}" title="Delete">
                        <i class="fas fa-trash"></i> <span>Delete</span>
                    </button>
                </td>
            `;
            
            if (user.banned) {
                tr.classList.add('admin-banned-user');
            }
            
            tbody.appendChild(tr);
        });
        
        // Add event listeners to ban/delete buttons
        document.querySelectorAll('.admin-confirm-btn, .admin-delete-btn').forEach(btn => {
            if (btn.textContent.includes('Ban') || btn.textContent.includes('Unban')) {
                btn.addEventListener('click', function() {
                    toggleBanUser (parseInt(this.dataset.id));
                });
            } else if (btn.textContent.includes('Delete')) {
                btn.addEventListener('click', function() {
                    deleteUser (parseInt(this.dataset.id));
                });
            }
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function toggleBanUser (id) {
    const reason = prompt('Enter ban reason (leave empty to unban):');
    if (reason === null) return; // User cancelled
    
    try {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        if (users[id]) {
            if (reason === '') {
                // Unban user
                users[id].banned = false;
                delete users[id].banReason;
            } else {
                // Ban user
                users[id].banned = true;
                users[id].banReason = reason;
            }
            
            localStorage.setItem('users', JSON.stringify(users));
            
            // If banning the currently logged in user, log them out
            const loggedInUser  = JSON.parse(localStorage.getItem('loggedInUser'));
            if (loggedInUser  && loggedInUser .username === users[id].username) {
                localStorage.removeItem('loggedInUser');
                window.location.href = 'login.html?banned=true';
                return;
            }
            
            loadUsers();
        }
    } catch (error) {
        console.error('Error toggling user ban:', error);
    }
}

function deleteUser (id) {
    if (confirm('Are you sure you want to permanently delete this user account?')) {
        try {
            const users = JSON.parse(localStorage.getItem('users')) || [];
            const userToDelete = users[id];
            
            // If deleting the currently logged in user, log them out first
            const loggedInUser  = JSON.parse(localStorage.getItem('loggedInUser'));
            if (loggedInUser  && loggedInUser .username === userToDelete.username) {
                localStorage.removeItem('loggedInUser');
            }
            
            users.splice(id, 1);
            localStorage.setItem('users', JSON.stringify(users));
            loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    }
}

// Flash Sale Functions
function loadFlashSaleProductOptions() {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const container = document.getElementById('products-checkboxes');
    container.innerHTML = '';
    
    products.filter(p => !p.deleted).forEach(product => {
        const div = document.createElement('div');
        div.className = 'admin-checkbox-item';
        div.innerHTML = `
            <input type="checkbox" id="product-${product.id}" value="${product.id}" class="product-checkbox">
            <label for="product-${product.id}">
                <span class="product-name">${product.name}</span>
                <span class="product-category">${product.category}</span>
            </label>
        `;
        container.appendChild(div);
    });
}

function loadFlashSaleCategoryOptions() {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const categories = [...new Set(products.filter(p => !p.deleted).map(p => p.category))];
    const container = document.getElementById('categories-checkboxes');
    container.innerHTML = '';
    
    categories.forEach(category => {
        const div = document.createElement('div');
        div.className = 'admin-checkbox-item';
        div.innerHTML = `
            <input type="checkbox" id="category-${category}" value="${category}" class="category-checkbox">
            <label for="category-${category}">${category}</label>
        `;
        container.appendChild(div);
    });
}

function saveFlashSale() {
    try {
        const id = document.getElementById('flashsale-id').value;
        const name = document.getElementById('flashsale-name').value;
        const scope = document.getElementById('flashsale-scope').value;
        const discountType = document.getElementById('flashsale-discount-type').value;
        const discountValue = parseFloat(document.getElementById('flashsale-discount-value').value);
        const startTime = document.getElementById('flashsale-start').value;
        const endTime = document.getElementById('flashsale-end').value;
        
        // Validate inputs
        if (!name || isNaN(discountValue) || discountValue <= 0 || !startTime || !endTime) {
            alert('Please fill all fields with valid values');
            return;
        }
        
        if (new Date(startTime) >= new Date(endTime)) {
            alert('End time must be after start time');
            return;
        }
        
        // Get selected products or categories based on scope
        let selectedItems = [];
        if (scope === 'products') {
            selectedItems = Array.from(document.querySelectorAll('.product-checkbox:checked'))
                                .map(cb => cb.value);
        } else if (scope === 'categories') {
            selectedItems = Array.from(document.querySelectorAll('.category-checkbox:checked'))
                                .map(cb => cb.value);
        }
        
        const flashSales = JSON.parse(localStorage.getItem('flashSales')) || [];
        
        if (id === '') {
            // Add new flash sale
            flashSales.push({
                id: Date.now().toString(),
                name,
                scope,
                [scope === 'products' ? 'products' : 'categories']: selectedItems,
                discountType,
                discountValue,
                startTime,
                endTime,
                createdAt: new Date().toISOString()
            });
        } else {
            // Update existing flash sale
            const index = flashSales.findIndex(fs => fs.id === id);
            if (index !== -1) {
                flashSales[index] = {
                    ...flashSales[index],
                    name,
                    scope,
                    [scope === 'products' ? 'products' : 'categories']: selectedItems,
                    discountType,
                    discountValue,
                    startTime,
                    endTime
                };
            }
        }
        
        localStorage.setItem('flashSales', JSON.stringify(flashSales));
        loadFlashSales();
        document.getElementById('flashsale-modal').style.display = 'none';
        
        // Dispatch event to notify other pages of flash sale changes
        window.dispatchEvent(new Event('storage'));
    } catch (error) {
        console.error('Error saving flash sale:', error);
        alert('An error occurred while saving the flash sale');
    }
}

function loadFlashSales() {
    try {
        const flashSales = JSON.parse(localStorage.getItem('flashSales')) || [];
        const tbody = document.querySelector('#flashsales-table tbody');
        tbody.innerHTML = '';
        
        const now = new Date();
        
        flashSales.forEach((sale, index) => {
            const start = new Date(sale.startTime);
            const end = new Date(sale.endTime);
            
            let status = 'Scheduled';
            let statusClass = 'admin-status-pending';
            
            if (now >= start && now <= end) {
                status = 'Active';
                statusClass = 'admin-status-confirmed';
            } else if (now > end) {
                status = 'Ended';
                statusClass = 'admin-status-expired';
            }
            
            // Calculate time left
            let timeLeft = '';
            if (now < end) {
                const diff = (now < start ? start : end) - now;
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                
                if (now < start) {
                    timeLeft = `Starts in ${days}d ${hours}h ${minutes}m`;
                } else {
                    timeLeft = `${days}d ${hours}h ${minutes}m left`;
                }
            } else {
                timeLeft = 'Sale ended';
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${sale.name}</td>
                <td>${sale.scope === 'products' ? 
                    `${sale.products.length} products` : 
                    `${sale.categories.length} categories`}</td>
                <td>${sale.discountType === 'percentage' ? 
                    `${sale.discountValue}% off` : 
                    `₱${sale.discountValue} off`}</td>
                <td>${new Date(sale.startTime).toLocaleString()}</td>
                <td>${new Date(sale.endTime).toLocaleString()}</td>
                <td>${timeLeft}</td>
                <td><span class="admin-status ${statusClass}">${status}</span></td>
                <td>
                    <button class="admin-action-btn admin-edit-btn" data-id="${index}">
                        <i class="fas fa-edit"></i> <span>Edit</span>
                    </button>
                    <button class="admin-action-btn admin-delete-btn" data-id="${index}">
                        <i class="fas fa-trash"></i> <span>Delete</span>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        // Add event listeners to edit/delete buttons
        document.querySelectorAll('.admin-edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                editFlashSale(parseInt(this.dataset.id));
            });
        });
        
        document.querySelectorAll('.admin-delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteFlashSale(parseInt(this.dataset.id));
            });
        });
    } catch (error) {
        console.error('Error loading flash sales:', error);
    }
}

function editFlashSale(id) {
    try {
        const flashSales = JSON.parse(localStorage.getItem('flashSales')) || [];
        const sale = flashSales[id];
        
        if (sale) {
            document.getElementById('flashsale-modal-title').textContent = 'Edit Flash Sale';
            document.getElementById('flashsale-id').value = sale.id;
            document.getElementById('flashsale-name').value = sale.name;
            document.getElementById('flashsale-scope').value = sale.scope;
            document.getElementById('flashsale-discount-type').value = sale.discountType;
            document.getElementById('flashsale-discount-value').value = sale.discountValue;
            document.getElementById('flashsale-start').value = sale.startTime.slice(0, 16);
            document.getElementById('flashsale-end').value = sale.endTime.slice(0, 16);
            
            // Update UI based on scope
            document.getElementById('products-selector').style.display = sale.scope === 'products' ? 'block' : 'none';
            document.getElementById('categories-selector').style.display = sale.scope === 'categories' ? 'block' : 'none';
            document.getElementById('discount-symbol').textContent = sale.discountType === 'percentage' ? '%' : '₱';
            
            // Load options and check the selected ones
            loadFlashSaleProductOptions();
            loadFlashSaleCategoryOptions();
            
            if (sale.scope === 'products') {
                sale.products.forEach(productId => {
                    const checkbox = document.getElementById(`product-${productId}`);
                    if (checkbox) checkbox.checked = true;
                });
            } else if (sale.scope === 'categories') {
                sale.categories.forEach(category => {
                    const checkbox = document.getElementById(`category-${category}`);
                    if (checkbox) checkbox.checked = true;
                });
            }
            
            document.getElementById('flashsale-modal').style.display = 'flex';
        }
    } catch (error) {
        console.error('Error editing flash sale:', error);
    }
}

function deleteFlashSale(id) {
    if (confirm('Are you sure you want to delete this flash sale?')) {
        try {
            const flashSales = JSON.parse(localStorage.getItem('flashSales')) || [];
            flashSales.splice(id, 1);
            localStorage.setItem('flashSales', JSON.stringify(flashSales));
            loadFlashSales();
            window.dispatchEvent(new Event('storage'));
        } catch (error) {
            console.error('Error deleting flash sale:', error);
        }
    }
}

// Initialize the admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set active section based on URL hash if present
    const hash = window.location.hash.substring(1);
    if (hash) {
        const section = document.getElementById(`${hash}-section`);
        if (section) {
            // Hide all sections first
            document.querySelectorAll('[id$="-section"]').forEach(s => {
                s.style.display = 'none';
            });
            
            // Show the requested section
            section.style.display = 'block';
            
            // Update active nav link
            document.querySelectorAll('.sidebar-menu a').forEach(link => {
                link.classList.remove('active');
                if (link.dataset.section === hash) {
                    link.classList.add('active');
                }
            });
            
            // Load section data
            switch(hash) {
                case 'dashboard':
                    loadDashboardData();
                    break;
                case 'products':
                    loadProducts();
                    break;
                case 'reservations':
                    loadReservations();
                    break;
                case 'users':
                    loadUsers();
                    break;
                case 'feedback':
                    loadFeedback();
                    break;
                case 'orders':
                    loadOrderHistory();
                    break;
                case 'flashsales':
                    loadFlashSales();
                    break;
            }
        }
    }
});