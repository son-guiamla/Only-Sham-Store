// Admin Dashboard Script
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Check if admin is logged in
        const loggedInAdmin = JSON.parse(localStorage.getItem('loggedInAdmin'));
        if (!loggedInAdmin) {
            window.location.href = 'login.php';
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
                window.location.href = 'logout.php';
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
async function loadDashboardData() {
    try {
        // Fetch data from server
        const [productsRes, usersRes] = await Promise.all([
            fetch('products.php?action=getAll'),
            fetch('users.php?action=getAll')
        ]);

        if (!productsRes.ok || !usersRes.ok) {
            throw new Error('Failed to fetch dashboard data');
        }

        const products = await productsRes.json();
        const users = await usersRes.json();

        if (!products.success || !users.success) {
            throw new Error('Failed to parse dashboard data');
        }

        // Update product count
        const totalProductsEl = document.getElementById('total-products');
        if (totalProductsEl) {
            totalProductsEl.textContent = products.data.length;
        }
        
        // Update user count
        const totalUsersEl = document.getElementById('total-users');
        if (totalUsersEl) {
            totalUsersEl.textContent = users.data.length;
        }
        
        // Fetch reservations data
        const reservationsRes = await fetch('reservations.php?action=getAll');
        if (!reservationsRes.ok) {
            throw new Error('Failed to fetch reservations');
        }
        
        const reservations = await reservationsRes.json();
        if (!reservations.success) {
            throw new Error('Failed to parse reservations');
        }

        let activeReservations = 0;
        let totalRevenue = 0;
        let pickedItemsCount = 0;

        reservations.data.forEach(reservation => {
            if (reservation.status === 'confirmed') {
                activeReservations++;
                totalRevenue += reservation.total_amount;
            } else if (reservation.status === 'completed') {
                pickedItemsCount++;
                totalRevenue += reservation.total_amount;
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
        initCharts(users.data, reservations.data);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function initCharts(users, reservations) {
    try {
        // Sales chart
        const salesData = getSalesData(reservations);
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
        const statusData = getReservationStatusData(reservations);
        const statusCtx = document.getElementById('reservationStatusChart')?.getContext('2d');
        
        if (statusCtx) {
            new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Pending', 'Reserved', 'Confirmed', 'Completed', 'Expired'],
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

function getSalesData(reservations) {
    const monthlySales = Array(12).fill(0);
    
    reservations.forEach(reservation => {
        if (reservation.status === 'completed' || reservation.status === 'confirmed') {
            const date = new Date(reservation.created_at);
            const month = date.getMonth();
            monthlySales[month] += reservation.total_amount;
        }
    });
    
    return monthlySales;
}

function getReservationStatusData(reservations) {
    const statusCounts = {
        pending: 0,
        reserved: 0,
        confirmed: 0,
        completed: 0,
        expired: 0
    };
    
    const now = new Date();
    
    reservations.forEach(reservation => {
        if (reservation.status === 'completed') {
            statusCounts.completed++;
        } else if (reservation.status === 'confirmed') {
            statusCounts.confirmed++;
        } else if (reservation.status === 'reserved') {
            statusCounts.reserved++;
        } else if (reservation.status === 'pending') {
            statusCounts.pending++;
        }
        
        // Check for expired reservations
        if (reservation.status === 'reserved' || reservation.status === 'confirmed') {
            const expiryDate = new Date(reservation.created_at);
            expiryDate.setDate(expiryDate.getDate() + 3);
            if (expiryDate < now) {
                statusCounts.expired++;
            }
        }
    });
    
    return [
        statusCounts.pending,
        statusCounts.reserved,
        statusCounts.confirmed,
        statusCounts.completed,
        statusCounts.expired
    ];
}

// Load feedback data
async function loadFeedback() {
    try {
        const response = await fetch('reviews.php?action=getAll');
        if (!response.ok) throw new Error('Failed to fetch feedback');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to load feedback');
        
        const tbody = document.querySelector('#feedback-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        data.reviews.forEach((feedback, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${feedback.username}</td>
                <td><img src="${feedback.profile_picture || 'assets/default-profile.png'}" alt="${feedback.username}" width="50" style="border-radius: 50%;"></td>
                <td>${'★'.repeat(feedback.rating)}${'☆'.repeat(5 - feedback.rating)}</td>
                <td>${feedback.comment}</td>
                <td>${new Date(feedback.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="admin-action-btn admin-delete-btn" data-id="${feedback.id}"><i class="fas fa-trash"></i> <span>Delete</span></button>
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
async function deleteFeedback(id) {
    if (confirm('Are you sure you want to delete this feedback?')) {
        try {
            const response = await fetch(`reviews.php?action=delete&id=${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Failed to delete feedback');
            
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Failed to delete feedback');
            
            loadFeedback();
        } catch (error) {
            console.error('Error deleting feedback:', error);
        }
    }
}

// Product management
async function loadProducts() {
    try {
        const response = await fetch('products.php?action=getAll');
        if (!response.ok) throw new Error('Failed to fetch products');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to load products');
        
        const tbody = document.querySelector('#products-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        data.products.forEach((product) => {
            // Format sizes for display
            let sizesDisplay = 'No sizes';
            if (product.sizes && product.sizes.length > 0) {
                sizesDisplay = product.sizes.map(size => `${size.size}: ${size.quantity}`).join(', ');
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${product.image || 'assets/default-product.jpg'}" alt="${product.name}" width="50"></td>
                <td>${product.name}</td>
                <td>₱${product.price.toFixed(2)}</td>
                <td>${product.category || 'N/A'}</td>
                <td>${sizesDisplay}</td>
                <td>
                    <button class="admin-action-btn admin-edit-btn" data-id="${product.id}"><i class="fas fa-edit"></i> <span>Edit</span></button>
                    <button class="admin-action-btn admin-delete-btn" data-id="${product.id}"><i class="fas fa-trash"></i> <span>Delete</span></button>
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

async function editProduct(id) {
    try {
        const response = await fetch(`products.php?action=getById&id=${id}`);
        if (!response.ok) throw new Error('Failed to fetch product');
        
        const data = await response.json();
        if (!data.success || !data.product) throw new Error(data.error || 'Product not found');
        
        const product = data.product;
        
        document.getElementById('product-modal-title').textContent = 'Edit Product';
        document.getElementById('product-id').value = product.id;
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
            if (product.sizes && product.sizes.length > 0) {
                product.sizes.forEach(size => {
                    addSizeInput(size.size, size.quantity);
                });
            } else {
                // Default to empty if no sizes exist
                addSizeInput('S', 0);
            }
        }
        
        document.getElementById('product-modal').style.display = 'flex';
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

// Save product data
async function saveProduct() {
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
        const sizes = [];
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
            sizes.push({ size, quantity });
        });

        // Prepare form data
        const formData = new FormData();
        formData.append('id', id);
        formData.append('name', name);
        formData.append('price', price);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('featured', featured);
        formData.append('sizes', JSON.stringify(sizes));
        
        if (imageInput.files && imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }

        const url = id ? 'products.php?action=update' : 'products.php?action=create';
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error('Failed to save product');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to save product');
        
        document.getElementById('product-modal').style.display = 'none';
        loadProducts();
    } catch (error) {
        console.error('Error saving product:', error);
        alert('An error occurred while saving the product. Please check the console for details.');
    }
}

async function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            const response = await fetch(`products.php?action=delete&id=${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Failed to delete product');
            
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Failed to delete product');
            
            loadProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    }
}

// Reservation management
async function loadReservations() {
    try {
        const response = await fetch('reservations.php?action=getAll');
        if (!response.ok) throw new Error('Failed to fetch reservations');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to load reservations');
        
        const tbody = document.querySelector('#reservations-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        data.reservations.forEach((reservation) => {
            const items = JSON.parse(reservation.items);
            const statusClass = reservation.status === 'confirmed' ? 'admin-status-confirmed' : 
                              reservation.status === 'completed' ? 'admin-status-completed' : 'admin-status-reserved';
            
            // Check if reservation is expired
            let isExpired = false;
            if (reservation.status === 'reserved' || reservation.status === 'confirmed') {
                const expiryDate = new Date(reservation.created_at);
                expiryDate.setDate(expiryDate.getDate() + 3);
                isExpired = expiryDate < new Date();
            }
            
            items.forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${reservation.username}</td>
                    <td>${item.name}</td>
                    <td>${item.size}</td>
                    <td>${item.quantity}</td>
                    <td>₱${(item.price * item.quantity).toFixed(2)}</td>
                    <td><span class="admin-status ${statusClass} ${isExpired ? 'admin-status-expired' : ''}">
                        ${isExpired ? 'Expired' : reservation.status}
                    </span></td>
                    <td>${reservation.status === 'completed' ? new Date(reservation.updated_at).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        ${reservation.status === 'reserved' && !isExpired ? 
                            `<button class="admin-action-btn admin-confirm-btn" data-id="${reservation.id}" data-index="${index}">
                                <i class="fas fa-check"></i> <span>Confirm</span>
                            </button>` : ''}
                        ${reservation.status !== 'completed' && !isExpired ? 
                            `<button class="admin-action-btn admin-complete-btn" data-id="${reservation.id}" data-index="${index}">
                                <i class="fas fa-check-circle"></i> <span>Mark as Completed</span>
                            </button>` : ''}
                        <button class="admin-action-btn admin-delete-btn" data-id="${reservation.id}">
                            <i class="fas fa-trash"></i> <span>Delete</span>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        });
        
        // Add event listeners to buttons
        document.querySelectorAll('.admin-confirm-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                confirmReservation(this.dataset.id);
            });
        });
        
        document.querySelectorAll('.admin-complete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                completeReservation(this.dataset.id);
            });
        });
        
        document.querySelectorAll('.admin-delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteReservation(this.dataset.id);
            });
        });
    } catch (error) {
        console.error('Error loading reservations:', error);
    }
}

async function confirmReservation(id) {
    try {
        const response = await fetch(`reservations.php?action=confirm&id=${id}`, {
            method: 'PUT'
        });
        
        if (!response.ok) throw new Error('Failed to confirm reservation');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to confirm reservation');
        
        loadReservations();
    } catch (error) {
        console.error('Error confirming reservation:', error);
    }
}

async function completeReservation(id) {
    try {
        const response = await fetch(`reservations.php?action=complete&id=${id}`, {
            method: 'PUT'
        });
        
        if (!response.ok) throw new Error('Failed to complete reservation');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to complete reservation');
        
        loadReservations();
        loadOrderHistory();
    } catch (error) {
        console.error('Error completing reservation:', error);
    }
}

async function deleteReservation(id) {
    if (!confirm('Are you sure you want to delete this reservation?')) return;
    
    try {
        const response = await fetch(`reservations.php?action=delete&id=${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete reservation');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to delete reservation');
        
        loadReservations();
    } catch (error) {
        console.error('Error deleting reservation:', error);
    }
}

async function loadOrderHistory() {
    try {
        const response = await fetch('reservations.php?action=getCompleted');
        if (!response.ok) throw new Error('Failed to fetch order history');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to load order history');
        
        const tbody = document.querySelector('#orders-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        data.reservations.forEach((reservation) => {
            const items = JSON.parse(reservation.items);
            
            items.forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${reservation.username}</td>
                    <td>${item.name}</td>
                    <td>${item.size}</td>
                    <td>${item.quantity}</td>
                    <td>₱${(item.price * item.quantity).toFixed(2)}</td>
                    <td><span class="admin-status admin-status-completed">Completed</span></td>
                    <td>${new Date(reservation.updated_at).toLocaleDateString()}</td>
                    <td>
                        <button class="admin-action-btn admin-delete-btn" data-id="${reservation.id}" data-index="${index}">
                            <i class="fas fa-trash"></i> <span>Delete</span>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        });
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.admin-delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteOrder(this.dataset.id);
            });
        });
    } catch (error) {
        console.error('Error loading order history:', error);
    }
}

async function deleteOrder(id) {
    if (!confirm('Are you sure you want to delete this order record?')) return;
    
    try {
        const response = await fetch(`reservations.php?action=delete&id=${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete order');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to delete order');
        
        loadOrderHistory();
    } catch (error) {
        console.error('Error deleting order:', error);
    }
}

// User management
async function loadUsers() {
    try {
        const response = await fetch('users.php?action=getAll');
        if (!response.ok) throw new Error('Failed to fetch users');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to load users');
        
        const tbody = document.querySelector('#users-table tbody');
        tbody.innerHTML = '';
        
        data.users.forEach((user) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.fullname || 'N/A'}</td>
                <td>${user.username}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>${user.reservation_count || 0}</td>
                <td>${user.completed_count || 0}</td>
                <td>${user.expired_count || 0}</td>
                <td>
                    ${user.banned ? 
                        `<span class="admin-status admin-status-expired">Banned</span>
                         <small>${user.ban_reason || 'No reason'}</small>` : 
                        '<span class="admin-status admin-status-confirmed">Active</span>'}
                </td>
                <td>
                    <button class="admin-action-btn ${user.banned ? 'admin-confirm-btn' : 'admin-delete-btn'}" data-id="${user.id}" title="${user.banned ? 'Unban' : 'Ban'}">
                        <i class="fas ${user.banned ? 'fa-unlock' : 'fa-ban'}"></i> <span>${user.banned ? 'Unban' : 'Ban'}</span>
                    </button>
                    <button class="admin-action-btn admin-delete-btn" data-id="${user.id}" title="Delete">
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
                    toggleBanUser(parseInt(this.dataset.id));
                });
            } else if (btn.textContent.includes('Delete')) {
                btn.addEventListener('click', function() {
                    deleteUser(parseInt(this.dataset.id));
                });
            }
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function toggleBanUser(id) {
    const reason = prompt('Enter ban reason (leave empty to unban):');
    if (reason === null) return; // User cancelled
    
    try {
        const response = await fetch(`users.php?action=toggleBan&id=${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });
        
        if (!response.ok) throw new Error('Failed to toggle ban status');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to toggle ban status');
        
        loadUsers();
    } catch (error) {
        console.error('Error toggling user ban:', error);
    }
}

async function deleteUser(id) {
    if (confirm('Are you sure you want to permanently delete this user account?')) {
        try {
            const response = await fetch(`users.php?action=delete&id=${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Failed to delete user');
            
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Failed to delete user');
            
            loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    }
}

// Flash Sale Functions
async function loadFlashSaleProductOptions() {
    try {
        const response = await fetch('products.php?action=getAll');
        if (!response.ok) throw new Error('Failed to fetch products');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to load products');
        
        const container = document.getElementById('products-checkboxes');
        container.innerHTML = '';
        
        data.products.forEach(product => {
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
    } catch (error) {
        console.error('Error loading product options:', error);
    }
}

async function loadFlashSaleCategoryOptions() {
    try {
        const response = await fetch('categories.php?action=getAll');
        if (!response.ok) throw new Error('Failed to fetch categories');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to load categories');
        
        const container = document.getElementById('categories-checkboxes');
        container.innerHTML = '';
        
        data.categories.forEach(category => {
            const div = document.createElement('div');
            div.className = 'admin-checkbox-item';
            div.innerHTML = `
                <input type="checkbox" id="category-${category.id}" value="${category.id}" class="category-checkbox">
                <label for="category-${category.id}">${category.name}</label>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading category options:', error);
    }
}

async function saveFlashSale() {
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
        
        const flashSaleData = {
            id: id || null,
            name,
            scope,
            discount_type: discountType,
            discount_value: discountValue,
            start_time: startTime,
            end_time: endTime,
            [scope === 'products' ? 'product_ids' : 'category_ids']: selectedItems
        };

        const url = id ? 'flashsales.php?action=update' : 'flashsales.php?action=create';
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(flashSaleData)
        });
        
        if (!response.ok) throw new Error('Failed to save flash sale');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to save flash sale');
        
        loadFlashSales();
        document.getElementById('flashsale-modal').style.display = 'none';
    } catch (error) {
        console.error('Error saving flash sale:', error);
        alert('An error occurred while saving the flash sale');
    }
}

async function loadFlashSales() {
    try {
        const response = await fetch('flashsales.php?action=getAll');
        if (!response.ok) throw new Error('Failed to fetch flash sales');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to load flash sales');
        
        const tbody = document.querySelector('#flashsales-table tbody');
        tbody.innerHTML = '';
        
        const now = new Date();
        
        data.flashSales.forEach((sale) => {
            const start = new Date(sale.start_time);
            const end = new Date(sale.end_time);
            
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
                    `${sale.product_ids.length} products` : 
                    `${sale.category_ids.length} categories`}</td>
                <td>${sale.discount_type === 'percentage' ? 
                    `${sale.discount_value}% off` : 
                    `₱${sale.discount_value} off`}</td>
                <td>${new Date(sale.start_time).toLocaleString()}</td>
                <td>${new Date(sale.end_time).toLocaleString()}</td>
                <td>${timeLeft}</td>
                <td><span class="admin-status ${statusClass}">${status}</span></td>
                <td>
                    <button class="admin-action-btn admin-edit-btn" data-id="${sale.id}">
                        <i class="fas fa-edit"></i> <span>Edit</span>
                    </button>
                    <button class="admin-action-btn admin-delete-btn" data-id="${sale.id}">
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

async function editFlashSale(id) {
    try {
        const response = await fetch(`flashsales.php?action=getById&id=${id}`);
        if (!response.ok) throw new Error('Failed to fetch flash sale');
        
        const data = await response.json();
        if (!data.success || !data.flashSale) throw new Error(data.error || 'Flash sale not found');
        
        const sale = data.flashSale;
        
        document.getElementById('flashsale-modal-title').textContent = 'Edit Flash Sale';
        document.getElementById('flashsale-id').value = sale.id;
        document.getElementById('flashsale-name').value = sale.name;
        document.getElementById('flashsale-scope').value = sale.scope;
        document.getElementById('flashsale-discount-type').value = sale.discount_type;
        document.getElementById('flashsale-discount-value').value = sale.discount_value;
        document.getElementById('flashsale-start').value = sale.start_time.slice(0, 16);
        document.getElementById('flashsale-end').value = sale.end_time.slice(0, 16);
        
        // Update UI based on scope
        document.getElementById('products-selector').style.display = sale.scope === 'products' ? 'block' : 'none';
        document.getElementById('categories-selector').style.display = sale.scope === 'categories' ? 'block' : 'none';
        document.getElementById('discount-symbol').textContent = sale.discount_type === 'percentage' ? '%' : '₱';
        
        // Load options and check the selected ones
        await loadFlashSaleProductOptions();
        await loadFlashSaleCategoryOptions();
        
        if (sale.scope === 'products') {
            sale.product_ids.forEach(productId => {
                const checkbox = document.getElementById(`product-${productId}`);
                if (checkbox) checkbox.checked = true;
            });
        } else if (sale.scope === 'categories') {
            sale.category_ids.forEach(categoryId => {
                const checkbox = document.getElementById(`category-${categoryId}`);
                if (checkbox) checkbox.checked = true;
            });
        }
        
        document.getElementById('flashsale-modal').style.display = 'flex';
    } catch (error) {
        console.error('Error editing flash sale:', error);
    }
}

async function deleteFlashSale(id) {
    if (confirm('Are you sure you want to delete this flash sale?')) {
        try {
            const response = await fetch(`flashsales.php?action=delete&id=${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Failed to delete flash sale');
            
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Failed to delete flash sale');
            
            loadFlashSales();
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