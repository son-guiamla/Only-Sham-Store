document.addEventListener('DOMContentLoaded', function() {
    initAdminDashboard();
});

let salesChart = null;
let reservationStatusChart = null;
let updateEventSource = null;

function initAdminDashboard() {
    try {
        setupNavigation();
        setupModals();
        setupForms();
        setupLogout();
        loadDashboardData();
        checkUrlHash();
        setupSSEListener();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('An error occurred during initialization. Please refresh the page.');
    }
}

function setupSSEListener() {
    if (updateEventSource) {
        updateEventSource.close();
    }

    updateEventSource = new EventSource('includes/admin-api.php?action=listen_updates');
    
    updateEventSource.addEventListener('heartbeat', function(event) {
        console.log('Heartbeat received:', JSON.parse(event.data));
    });

    updateEventSource.addEventListener('update', function(event) {
        const data = JSON.parse(event.data);
        console.log('Update received:', data);
        const activeSection = document.querySelector('.sidebar-menu a.active')?.dataset.section;
        if (activeSection) {
            switch (activeSection) {
                case 'dashboard':
                    loadDashboardData();
                    break;
                case 'products':
                    loadProducts();
                    break;
                case 'reservations':
                    loadReservations();
                    break;
                case 'flashsales':
                    loadFlashSales();
                    break;
            }
        }
    });

    updateEventSource.onerror = function(error) {
        console.error('SSE error:', error);
        updateEventSource.close();
        setTimeout(setupSSEListener, 5000); // Reconnect after 5 seconds
    };
}

function triggerProductUpdate() {
    const timestamp = new Date().toISOString();
    localStorage.setItem('last_update_timestamp', timestamp);
    
    window.dispatchEvent(new StorageEvent('storage', {
        key: 'last_update_timestamp',
        newValue: timestamp
    }));
    
    fetch('includes/admin-api.php?action=notify_update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timestamp })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Update notification sent to server:', data);
    })
    .catch(error => {
        console.error('Error notifying update:', error);
    });
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-menu a');
    const sections = document.querySelectorAll('[id$="-section"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.dataset.section + '-section';
            
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            sections.forEach(section => section.style.display = 'none');
            const selectedSection = document.getElementById(sectionId);
            if (selectedSection) selectedSection.style.display = 'block';
            
            if (selectedSection) {
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
            }
        });
    });
}

function setupModals() {
    const baseUrl = 'http://localhost/onlyatsham/';

    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', function() {
            document.getElementById('product-modal-title').textContent = 'Add New Product';
            document.getElementById('product-form').reset();
            document.getElementById('product-id').value = '';
            document.getElementById('image-preview').innerHTML = `<span>No Image</span>`;
            document.querySelector('.admin-size-quantities').innerHTML = '';
            addSizeInput();
            document.getElementById('product-modal').style.display = 'flex';
        });
    }
    
    const addFlashsaleBtn = document.getElementById('add-flashsale-btn');
    if (addFlashsaleBtn) {
        addFlashsaleBtn.addEventListener('click', async function() {
            document.getElementById('flashsale-modal-title').textContent = 'Create Flash Sale';
            document.getElementById('flashsale-form').reset();
            document.getElementById('flashsale-id').value = '';
            document.getElementById('products-selector').style.display = 'block';
            document.getElementById('categories-selector').style.display = 'none';
            document.getElementById('flashsale-modal').style.display = 'flex';
            await Promise.all([
                loadFlashSaleProductOptions(),
                loadFlashSaleCategoryOptions()
            ]);
        });
    }
    
    const modals = document.querySelectorAll('.admin-modal');
    const closeButtons = document.querySelectorAll('.admin-close-btn');
    
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            modals.forEach(modal => modal.style.display = 'none');
        });
    });
    
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

function setupForms() {
    const baseUrl = 'http://localhost/onlyatsham/';

    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveProduct();
        });

        const imageInput = document.getElementById('product-image');
        if (imageInput) {
            imageInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                const preview = document.getElementById('image-preview');
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        preview.innerHTML = `<img src="${e.target.result}" alt="Image Preview" style="max-width: 100px; max-height: 100px;">`;
                    };
                    reader.readAsDataURL(file);
                } else {
                    preview.innerHTML = `<span>No Image</span>`;
                }
            });
        }
    }
    
    const addSizeBtn = document.getElementById('add-size-btn');
    if (addSizeBtn) {
        addSizeBtn.addEventListener('click', function() {
            addSizeInput();
        });
    }
    
    const flashsaleForm = document.getElementById('flashsale-form');
    if (flashsaleForm) {
        flashsaleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveFlashSale();
        });
    }
    
    const flashsaleScope = document.getElementById('flashsale-scope');
    if (flashsaleScope) {
        flashsaleScope.addEventListener('change', function() {
            const scope = this.value;
            document.getElementById('products-selector').style.display = scope === 'products' ? 'block' : 'none';
            document.getElementById('categories-selector').style.display = scope === 'categories' ? 'block' : 'none';
        });
    }
    
    const flashsaleDiscountType = document.getElementById('flashsale-discount-type');
    if (flashsaleDiscountType) {
        flashsaleDiscountType.addEventListener('change', function() {
            document.getElementById('discount-symbol').textContent = this.value === 'percentage' ? '%' : '₱';
        });
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutAdmin);
    }
}

async function logoutAdmin() {
    try {
        showLoading(true);
        await fetchData('logout');
        window.location.href = 'admin-login.php';
    } catch (error) {
        console.error('Logout error:', error);
        showError('Error logging out. Please try again.');
    } finally {
        showLoading(false);
    }
}

async function fetchData(action, data = {}) {
    try {
        const response = await fetch('includes/admin-api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, ...data })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Invalid response format: Expected JSON');
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Unknown error occurred');
        }
        
        return result.data;
    } catch (error) {
        console.error(`Error in ${action}:`, error);
        showError(error.message || 'An error occurred while fetching data');
        throw error;
    }
}

function showError(message) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'admin-error-message';
    errorContainer.textContent = message;
    document.body.appendChild(errorContainer);
    setTimeout(() => {
        errorContainer.remove();
    }, 5000);
}

function showSuccess(message) {
    const successContainer = document.createElement('div');
    successContainer.className = 'admin-success-message';
    successContainer.textContent = message;
    document.body.appendChild(successContainer);
    setTimeout(() => {
        successContainer.remove();
    }, 3000);
}

function showLoading(show = true) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

async function loadDashboardData() {
    try {
        showLoading(true);
        
        const data = await fetchData('dashboard_stats');
        
        document.getElementById('total-products').textContent = data.total_products || 0;
        document.getElementById('total-users').textContent = data.total_users || 0;
        document.getElementById('active-reservations').textContent = data.active_reservations || 0;
        document.getElementById('picked-orders').textContent = data.picked_orders || 0;
        document.getElementById('total-revenue').textContent = `₱${parseFloat(data.total_revenue || 0).toFixed(2)}`;
        
        initCharts(data.sales_data || [], data.reservation_status || []);
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error loading dashboard data:', error);
    }
}

function initCharts(salesData, reservationStatus) {
    try {
        if (salesChart) salesChart.destroy();
        if (reservationStatusChart) reservationStatusChart.destroy();
        
        const salesCtx = document.getElementById('salesChart')?.getContext('2d');
        if (salesCtx) {
            salesChart = new Chart(salesCtx, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                        label: 'Sales (₱)',
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
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '₱' + value.toLocaleString();
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return '₱' + context.raw.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        }
        
        const statusCtx = document.getElementById('reservationStatusChart')?.getContext('2d');
        if (statusCtx) {
            reservationStatusChart = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Pending', 'Confirmed', 'Picked', 'Expired'],
                    datasets: [{
                        data: reservationStatus,
                        backgroundColor: [
                            'rgba(255, 206, 86, 0.2)',
                            'rgba(75, 192, 192, 0.2)',
                            'rgba(153, 102, 255, 0.2)',
                            'rgba(255, 99, 132, 0.2)'
                        ],
                        borderColor: [
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 99, 132, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error initializing charts:', error);
        showError('Failed to initialize charts');
    }
}

async function loadProducts() {
    try {
        showLoading(true);
        
        const data = await fetchData('get_products');
        const products = data.products || [];
        
        const tbody = document.querySelector('#products-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        const baseUrl = 'http://localhost/onlyatsham/includes/';
        products.forEach(product => {
            let sizesDisplay = 'No sizes';
            if (product.sizes && Object.keys(product.sizes).length > 0) {
                sizesDisplay = Object.entries(product.sizes)
                    .map(([size, qty]) => `${size}: ${qty}`)
                    .join(', ');
            }
            
            const imageSrc = product.image ? `${baseUrl}${product.image}?t=${new Date().getTime()}` : '';
            const imageDisplay = imageSrc ? 
                `<img src="${imageSrc}" alt="${product.name}" width="50">` : 
                `<span>No Image</span>`;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${imageDisplay}</td>
                <td>${product.name}</td>
                <td>₱${parseFloat(product.price || 0).toFixed(2)}</td>
                <td>${product.category || 'N/A'}</td>
                <td>${sizesDisplay}</td>
                <td>
                    <button class="admin-action-btn admin-edit-btn" data-id="${product.id}"><i class="fas fa-edit"></i> <span>Edit</span></button>
                    <button class="admin-action-btn admin-delete-btn" data-id="${product.id}"><i class="fas fa-trash"></i> <span>Delete</span></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        document.querySelectorAll('.admin-edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                editProduct(this.dataset.id);
            });
        });
        
        document.querySelectorAll('.admin-delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteProduct(this.dataset.id);
            });
        });
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error loading products:', error);
    }
}

async function editProduct(productId) {
    try {
        showLoading(true);
        
        const data = await fetchData('get_product', { id: productId });
        const product = data.product;
        
        document.getElementById('product-modal-title').textContent = 'Edit Product';
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name || '';
        document.getElementById('product-price').value = parseFloat(product.price || 0).toFixed(2);
        document.getElementById('product-category').value = product.category || 'T-Shirts';
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-featured').checked = !!product.featured;
        
        const baseUrl = 'http://localhost/onlyatsham/includes/';
        const imagePreview = document.getElementById('image-preview');
        if (imagePreview) {
            const imageSrc = product.image ? `${baseUrl}${product.image}?t=${new Date().getTime()}` : '';
            imagePreview.innerHTML = imageSrc ? 
                `<img src="${imageSrc}" alt="Current Image" style="max-width: 100px; max-height: 100px;">` : 
                `<span>No Image</span>`;
        }
        
        const sizeContainer = document.querySelector('.admin-size-quantities');
        if (sizeContainer) {
            sizeContainer.innerHTML = '';
            if (product.sizes && Object.keys(product.sizes).length > 0) {
                for (const [size, quantity] of Object.entries(product.sizes)) {
                    addSizeInput(size, quantity);
                }
            } else {
                addSizeInput('S', 0);
            }
        }
        
        document.getElementById('product-modal').style.display = 'flex';
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error editing product:', error);
    }
}

function addSizeInput(size = 'S', quantity = 0) {
    const sizeContainer = document.querySelector('.admin-size-quantities');
    if (!sizeContainer) return;
    
    const uniqueId = `size-${Date.now()}`;
    
    const row = document.createElement('div');
    row.className = 'admin-size-quantity-row';
    row.innerHTML = `
        <label for="size-select-${uniqueId}" class="sr-only">Size</label>
        <select id="size-select-${uniqueId}" class="admin-size-select" name="size[]">
            <option value="S" ${size === 'S' ? 'selected' : ''}>Small (S)</option>
            <option value="M" ${size === 'M' ? 'selected' : ''}>Medium (M)</option>
            <option value="L" ${size === 'L' ? 'selected' : ''}>Large (L)</option>
            <option value="XL" ${size === 'XL' ? 'selected' : ''}>Extra Large (XL)</option>
        </select>
        
        <label for="size-quantity-${uniqueId}" class="sr-only">Quantity</label>
        <input type="number" id="size-quantity-${uniqueId}" class="admin-size-quantity" name="quantity[]" min="0" value="${quantity}" required autocomplete="off">
        
        <button type="button" class="admin-remove-size-btn" aria-label="Remove size option">
            <i class="fas fa-times"></i>
        </button>
    `;
    sizeContainer.appendChild(row);
    
    row.querySelector('.admin-remove-size-btn').addEventListener('click', function() {
        if (document.querySelectorAll('.admin-size-quantity-row').length > 1) {
            row.remove();
        } else {
            showError('At least one size is required');
        }
    });
}

async function saveProduct() {
    try {
        showLoading(true);
        
        const id = document.getElementById('product-id').value;
        const name = document.getElementById('product-name').value.trim();
        const price = parseFloat(document.getElementById('product-price').value);
        const imageInput = document.getElementById('product-image');
        const description = document.getElementById('product-description').value.trim();
        const category = document.getElementById('product-category').value;
        const featured = document.getElementById('product-featured').checked;
        
        if (!name) {
            throw new Error('Product name is required');
        }
        if (isNaN(price) || price <= 0) {
            throw new Error('Valid price is required');
        }
        if (!category) {
            throw new Error('Category is required');
        }

        const sizeQuantities = {};
        const sizeRows = document.querySelectorAll('.admin-size-quantity-row');
        
        if (sizeRows.length === 0) {
            throw new Error('Please add at least one size');
        }
        
        sizeRows.forEach(row => {
            const size = row.querySelector('.admin-size-select').value;
            const quantity = parseInt(row.querySelector('.admin-size-quantity').value) || 0;
            if (quantity < 0) {
                throw new Error('Quantity cannot be negative');
            }
            sizeQuantities[size] = quantity;
        });

        const formData = new FormData();
        formData.append('action', id ? 'update_product' : 'add_product');
        formData.append('id', id);
        formData.append('name', name);
        formData.append('price', price);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('featured', featured ? '1' : '0');
        formData.append('sizes', JSON.stringify(sizeQuantities));
        
        if (imageInput.files && imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }
        
        const response = await fetch('includes/admin-api.php', {
            method: 'POST',
            body: formData
        });
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Invalid response format: Expected JSON');
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to save product');
        }
        
        document.getElementById('product-modal').style.display = 'none';
        await loadProducts();
        triggerProductUpdate();
        showSuccess(`Product ${id ? 'updated' : 'added'} successfully!`);
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error saving product:', error);
        showError(error.message || 'Failed to save product');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        showLoading(true);
        
        const data = await fetchData('delete_product', { id: productId });
        await loadProducts();
        triggerProductUpdate();
        showSuccess('Product deleted successfully!');
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error deleting product:', error);
    }
}

async function loadReservations() {
    try {
        showLoading(true);
        
        const data = await fetchData('get_reservations');
        const reservations = data.reservations || [];
        
        const tbody = document.querySelector('#reservations-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        reservations.forEach(reservation => {
            const reservedAt = new Date(reservation.reserved_at);
            const expiryTime = new Date(reservedAt.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days in milliseconds
            const now = new Date();
            let timeLeft = '';
            if (['pending', 'confirmed'].includes(reservation.status)) {
                timeLeft = formatTimeLeft(expiryTime, now);
            } else {
                timeLeft = 'N/A';
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${reservation.customer_name || 'N/A'}</td>
                <td>${reservation.product_name || 'N/A'}</td>
                <td>${reservation.size || 'N/A'}</td>
                <td>${reservation.quantity || 0}</td>
                <td>₱${parseFloat(reservation.total_price || 0).toFixed(2)}</td>
                <td>${reservation.status || 'N/A'}</td>
                <td>${timeLeft}</td>
                <td>${reservation.picked_at || 'Not Picked'}</td>
                <td>
                    ${reservation.status === 'confirmed' ? 
                        `<button class="admin-action-btn admin-pickup-btn" data-id="${reservation.id}"><i class="fas fa-check"></i> <span>Mark as Picked</span></button>` : ''}
                    <button class="admin-action-btn admin-cancel-btn" data-id="${reservation.id}" ${reservation.status === 'picked' || reservation.status === 'expired' ? 'disabled' : ''}>
                        <i class="fas fa-times"></i> <span>Cancel</span>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        document.querySelectorAll('.admin-pickup-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                markReservationPicked(this.dataset.id);
            });
        });
        
        document.querySelectorAll('.admin-cancel-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                cancelReservation(this.dataset.id);
            });
        });
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error loading reservations:', error);
    }
}

async function markReservationPicked(reservationId) {
    try {
        showLoading(true);
        
        await fetchData('mark_reservation_picked', { id: reservationId });
        await loadReservations();
        showSuccess('Reservation marked as picked!');
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error marking reservation as picked:', error);
    }
}

async function cancelReservation(reservationId) {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;
    
    try {
        showLoading(true);
        
        await fetchData('cancel_reservation', { id: reservationId });
        await loadReservations();
        showSuccess('Reservation cancelled!');
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error cancelling reservation:', error);
    }
}

async function loadUsers() {
    try {
        showLoading(true);
        
        const data = await fetchData('get_users');
        const users = data.users || [];
        
        const tbody = document.querySelector('#users-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        users.forEach((user, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.fullname || 'N/A'}</td>
                <td>${user.username || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>${user.active_reservations || 0}</td>
                <td>${user.picked_reservations || 0}</td>
                <td>${user.expired_reservations || 0}</td>
                <td>
                    ${user.banned ? 
                        `<span class="admin-status admin-status-expired">Banned</span>
                         <small>${user.ban_reason || 'No reason'}</small>` : 
                        '<span class="admin-status admin-status-confirmed">Active</span>'}
                </td>
                <td>
                    <button class="admin-action-btn ${user.banned ? 'admin-confirm-btn' : 'admin-ban-btn'}" data-id="${user.id}" title="${user.banned ? 'Unban' : 'Ban'}">
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
        
        document.querySelectorAll('.admin-ban-btn, .admin-confirm-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                toggleBanUser(this.dataset.id);
            });
        });
        
        document.querySelectorAll('.admin-delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteUser(this.dataset.id);
            });
        });
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error loading users:', error);
        showError('Failed to load users');
    }
}

async function toggleBanUser(userId) {
    try {
        showLoading(true);
        
        const userRow = document.querySelector(`#users-table tbody tr:has(button[data-id="${userId}"])`);
        const isBanned = userRow.querySelector('.admin-status').textContent === 'Banned';
        const reason = !isBanned ? prompt('Enter ban reason:') : null;
        if (reason === null && !isBanned) return; // User cancelled ban action
        
        const newStatus = isBanned ? 'active' : 'inactive';
        const data = { id: userId, status: newStatus };
        if (reason) data.ban_reason = reason;
        
        await fetchData('toggle_user_status', data);
        await loadUsers();
        showSuccess(`User ${newStatus === 'active' ? 'unbanned' : 'banned'} successfully!`);
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error toggling user ban:', error);
        showError(error.message || 'Failed to toggle user status');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to permanently delete this user account?')) return;
    
    try {
        showLoading(true);
        
        await fetchData('delete_user', { id: userId });
        await loadUsers();
        showSuccess('User deleted successfully!');
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error deleting user:', error);
        showError(error.message || 'Failed to delete user');
    }
}

async function loadFeedback() {
    try {
        showLoading(true);
        
        const data = await fetchData('get_feedback');
        const feedback = data.feedback || [];
        
        const tbody = document.querySelector('#feedback-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        const baseUrl = 'http://localhost/onlyatsham/includes/';
        feedback.forEach(item => {
            const profileImage = item.profile_image ? 
                `${baseUrl}${item.profile_image}?t=${new Date().getTime()}` : 
                `${baseUrl}assets/default-profile.jpg`;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.username || 'N/A'}</td>
                <td><img src="${profileImage}" alt="${item.username}" width="40" class="admin-profile-img"></td>
                <td>${item.rating || 0}/5</td>
                <td>${item.comment || 'N/A'}</td>
                <td>${new Date(item.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="admin-action-btn admin-delete-btn" data-id="${item.id}">
                        <i class="fas fa-trash"></i> <span>Delete</span>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        document.querySelectorAll('.admin-delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteFeedback(this.dataset.id);
            });
        });
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error loading feedback:', error);
    }
}

async function deleteFeedback(feedbackId) {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    
    try {
        showLoading(true);
        
        await fetchData('delete_feedback', { id: feedbackId });
        await loadFeedback();
        showSuccess('Feedback deleted successfully!');
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error deleting feedback:', error);
    }
}

async function loadOrderHistory() {
    try {
        showLoading(true);
        
        const data = await fetchData('get_order_history');
        const orders = data.orders || [];
        
        const tbody = document.querySelector('#orders-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        orders.forEach(order => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${order.customer_name || 'N/A'}</td>
                <td>${order.product_name || 'N/A'}</td>
                <td>${order.size || 'N/A'}</td>
                <td>${order.quantity || 0}</td>
                <td>₱${parseFloat(order.total_price || 0).toFixed(2)}</td>
                <td>${order.status || 'N/A'}</td>
                <td>${order.picked_at || 'Not Picked'}</td>
                <td>
                    <button class="admin-action-btn admin-view-btn" data-id="${order.id}">
                        <i class="fas fa-eye"></i> <span>View</span>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        document.querySelectorAll('.admin-view-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                loadOrderDetails(this.dataset.id);
            });
        });
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error loading order history:', error);
    }
}

async function loadOrderDetails(orderId) {
    try {
        showLoading(true);
        
        const data = await fetchData('get_order_details', { id: orderId });
        const order = data.order;
        
        document.getElementById('order-details-title').textContent = `Order #${order.id}`;
        document.getElementById('order-customer').textContent = order.customer_name || 'N/A';
        document.getElementById('order-product').textContent = order.product_name || 'N/A';
        document.getElementById('order-size').textContent = order.size || 'N/A';
        document.getElementById('order-quantity').textContent = order.quantity || 0;
        document.getElementById('order-total').textContent = `₱${parseFloat(order.total_price || 0).toFixed(2)}`;
        document.getElementById('order-status').textContent = order.status || 'N/A';
        document.getElementById('order-reserved-at').textContent = order.reserved_at ? 
            new Date(order.reserved_at).toLocaleString() : 'N/A';
        document.getElementById('order-picked-at').textContent = order.picked_at ? 
            new Date(order.picked_at).toLocaleString() : 'Not Picked';
        
        document.getElementById('order-details-modal').style.display = 'flex';
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error loading order details:', error);
    }
}

async function loadFlashSales() {
    try {
        showLoading(true);
        
        const data = await fetchData('get_flash_sales');
        const flashSales = data.flash_sales || [];
        
        const tbody = document.querySelector('#flashsales-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        const now = new Date();
        flashSales.forEach(sale => {
            const endTime = new Date(sale.end_time);
            const timeLeft = endTime > now ? formatTimeLeft(endTime, now) : 'Ended';
            const status = sale.status === 'active' && endTime > now ? 'Active' : 'Ended';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${sale.name || 'N/A'}</td>
                <td>${sale.scope === 'products' ? 'Specific Products' : 'Categories'}</td>
                <td>${sale.discount_type === 'percentage' ? `${sale.discount_value}%` : `₱${sale.discount_value}`}</td>
                <td>${new Date(sale.start_time).toLocaleString()}</td>
                <td>${new Date(sale.end_time).toLocaleString()}</td>
                <td>${timeLeft}</td>
                <td>${status}</td>
                <td>
                    <button class="admin-action-btn admin-edit-flashsale-btn" data-id="${sale.id}"><i class="fas fa-edit"></i> <span>Edit</span></button>
                    <button class="admin-action-btn admin-delete-flashsale-btn" data-id="${sale.id}"><i class="fas fa-trash"></i> <span>Delete</span></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        document.querySelectorAll('.admin-edit-flashsale-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                editFlashSale(this.dataset.id);
            });
        });
        
        document.querySelectorAll('.admin-delete-flashsale-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteFlashSale(this.dataset.id);
            });
        });
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error loading flash sales:', error);
    }
}

async function loadFlashSaleProductOptions() {
    try {
        const data = await fetchData('get_products');
        const products = data.products || [];
        
        const container = document.getElementById('products-checkboxes');
        if (!container) return;
        
        container.innerHTML = '';
        
        products.forEach(product => {
            const div = document.createElement('div');
            div.className = 'admin-checkbox-item';
            div.innerHTML = `
                <input type="checkbox" id="product-${product.id}" name="products[]" value="${product.id}">
                <label for="product-${product.id}">${product.name}</label>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading flash sale product options:', error);
    }
}

async function loadFlashSaleCategoryOptions() {
    try {
        const categories = ['T-Shirts', 'Pants', 'Shoes', 'Jeans'];
        const container = document.getElementById('categories-checkboxes');
        if (!container) return;
        
        container.innerHTML = '';
        
        categories.forEach(category => {
            const div = document.createElement('div');
            div.className = 'admin-checkbox-item';
            div.innerHTML = `
                <input type="checkbox" id="category-${category}" name="categories[]" value="${category}">
                <label for="category-${category}">${category}</label>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading flash sale category options:', error);
    }
}

async function editFlashSale(saleId) {
    try {
        showLoading(true);
        
        const data = await fetchData('get_flash_sale', { id: saleId });
        const sale = data.flash_sale;
        
        document.getElementById('flashsale-modal-title').textContent = 'Edit Flash Sale';
        document.getElementById('flashsale-id').value = sale.id;
        document.getElementById('flashsale-name').value = sale.name || '';
        document.getElementById('flashsale-scope').value = sale.scope || 'products';
        document.getElementById('flashsale-discount-type').value = sale.discount_type || 'percentage';
        document.getElementById('flashsale-discount-value').value = sale.discount_value || 0;
        document.getElementById('flashsale-start').value = sale.start_time ? sale.start_time.slice(0, 16) : '';
        document.getElementById('flashsale-end').value = sale.end_time ? sale.end_time.slice(0, 16) : '';
        
        document.getElementById('products-selector').style.display = sale.scope === 'products' ? 'block' : 'none';
        document.getElementById('categories-selector').style.display = sale.scope === 'categories' ? 'block' : 'none';
        
        document.getElementById('discount-symbol').textContent = sale.discount_type === 'percentage' ? '%' : '₱';
        
        await Promise.all([
            loadFlashSaleProductOptions(),
            loadFlashSaleCategoryOptions()
        ]);
        
        // Pre-select existing items
        if (sale.scope === 'products' && sale.products) {
            sale.products.forEach(productId => {
                const checkbox = document.getElementById(`product-${productId}`);
                if (checkbox) checkbox.checked = true;
            });
        } else if (sale.scope === 'categories' && sale.categories) {
            sale.categories.forEach(category => {
                const checkbox = document.getElementById(`category-${category}`);
                if (checkbox) checkbox.checked = true;
            });
        }
        
        document.getElementById('flashsale-modal').style.display = 'flex';
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error editing flash sale:', error);
    }
}

async function saveFlashSale() {
    try {
        showLoading(true);
        
        const id = document.getElementById('flashsale-id').value;
        const name = document.getElementById('flashsale-name').value.trim();
        const scope = document.getElementById('flashsale-scope').value;
        const discountType = document.getElementById('flashsale-discount-type').value;
        const discountValue = parseFloat(document.getElementById('flashsale-discount-value').value);
        const startTime = document.getElementById('flashsale-start').value;
        const endTime = document.getElementById('flashsale-end').value;
        
        // Client-side validation
        if (!name) {
            throw new Error('Sale name is required');
        }
        if (isNaN(discountValue) || discountValue <= 0) {
            new Error('Valid discount value is required');
        }
        if (discountType === 'percentage' && discountValue > 100) {
            throw new Error('Percentage discount cannot exceed 100%');
        }
        if (!startTime || !endTime) {
            throw new Error('Start and end times are required');
        }
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error('Invalid date format for start or end time');
        }
        if (startDate >= endDate) {
            throw new Error('End time must be after start time');
        }

        // Collect selected products and categories
        const products = [];
        const categories = [];
        
        if (scope === 'products') {
            const productCheckboxes = document.querySelectorAll('#products-checkboxes input[name="products[]"]:checked');
            productCheckboxes.forEach(checkbox => {
                products.push(checkbox.value);
            });
            if (products.length === 0 && !id) {
                throw new Error('Please select at least one product');
            }
        } else if (scope === 'categories') {
            const categoryCheckboxes = document.querySelectorAll('#categories-checkboxes input[name="categories[]"]:checked');
            categoryCheckboxes.forEach(checkbox => {
                categories.push(checkbox.value);
            });
            if (categories.length === 0 && !id) {
                throw new Error('Please select at least one category');
            }
        } else {
            throw new Error('Invalid scope selected');
        }
        
        // Prepare data to send to the backend
        const data = {
            id: id || null,
            name,
            scope,
            products: scope === 'products' ? products : [],
            categories: scope === 'categories' ? categories : [],
            discount_type: discountType,
            discount_value: discountValue,
            start_time: startDate.toISOString().slice(0, 19).replace('T', ' '),
            end_time: endDate.toISOString().slice(0, 19).replace('T', ' ')
        };
        
        // Send the request to the backend
        await fetchData(id ? 'update_flash_sale' : 'add_flash_sale', data);
        
        // On success, close the modal and refresh the flash sales list
        document.getElementById('flashsale-modal').style.display = 'none';
        await loadFlashSales();
        triggerProductUpdate();
        showSuccess(`Flash sale ${id ? 'updated' : 'added'} successfully!`);
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error saving flash sale:', error);
        showError(error.message || 'Failed to save flash sale. Please check your inputs and try again.');
    }
}

async function deleteFlashSale(saleId) {
    if (!confirm('Are you sure you want to delete this flash sale?')) return;
    
    try {
        showLoading(true);
        
        await fetchData('delete_flash_sale', { id: saleId });
        await loadFlashSales();
        triggerProductUpdate();
        showSuccess('Flash sale deleted successfully!');
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error deleting flash sale:', error);
    }
}

function formatTimeLeft(endTime, now) {
    const diff = endTime - now;
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function checkUrlHash() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        const section = document.getElementById(`${hash}-section`);
        if (section) {
            document.querySelectorAll('[id$="-section"]').forEach(s => {
                s.style.display = 'none';
            });
            section.style.display = 'block';
            document.querySelectorAll('.sidebar-menu a').forEach(link => {
                link.classList.remove('active');
                if (link.dataset.section === hash) {
                    link.classList.add('active');
                }
            });
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
}