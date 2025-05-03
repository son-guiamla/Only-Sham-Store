// DOM Elements
const productsTableBody = document.getElementById('productsTableBody');
const addProductBtn = document.getElementById('addProductBtn');
const productModal = document.getElementById('productModal');
const closeModalBtn = document.querySelector('.close-btn');
const productForm = document.getElementById('productForm');
const modalTitle = document.getElementById('modalTitle');
const productOnSale = document.getElementById('productOnSale');
const salePriceGroup = document.getElementById('salePriceGroup');
const logoutBtn = document.querySelector('.logout-btn');

// Initialize the admin dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is admin
    if (!localStorage.getItem('is_admin') || localStorage.getItem('is_admin') !== 'true') {
        window.location.href = 'auth.html';
        return;
    }
    
    // Load products
    loadProducts();
    
    // Event listeners
    addProductBtn.addEventListener('click', () => openProductModal());
    closeModalBtn.addEventListener('click', () => closeProductModal());
    productOnSale.addEventListener('change', toggleSalePrice);
    productForm.addEventListener('submit', handleProductSubmit);
    logoutBtn.addEventListener('click', handleLogout);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === productModal) {
            closeProductModal();
        }
    });
});

// Load products from server
function loadProducts() {
    fetch('products.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderProductsTable(data.products);
            } else {
                console.error('Failed to load products:', data.message);
            }
        })
        .catch(error => {
            console.error('Error loading products:', error);
        });
}

// Render products table
function renderProductsTable(products) {
    productsTableBody.innerHTML = '';
    
    if (products.length === 0) {
        productsTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No products found</td></tr>';
        return;
    }
    
    products.forEach(product => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>
                <div class="product-image-cell">
                    <img src="${product.image_path}" alt="${product.name}">
                </div>
            </td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>₱${product.is_on_sale ? product.sale_price.toFixed(2) : product.price.toFixed(2)}</td>
            <td>${product.stock_quantity}</td>
            <td>
                <span class="status-badge ${product.stock_quantity > 0 ? 'in-stock' : 'out-of-stock'}">
                    ${product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-edit" data-id="${product.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-delete" data-id="${product.id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        
        productsTableBody.appendChild(row);
    });
    
    // Add event listeners to edit and delete buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => editProduct(btn.dataset.id));
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
    });
}

// Open product modal for adding new product
function openProductModal(product = null) {
    if (product) {
        modalTitle.textContent = 'Edit Product';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productStock').value = product.stock_quantity;
        document.getElementById('productOnSale').checked = product.is_on_sale;
        document.getElementById('productSalePrice').value = product.sale_price || '';
        
        if (product.is_on_sale) {
            salePriceGroup.style.display = 'block';
        }
        
        // Show image preview if exists
        const imagePreview = document.getElementById('imagePreview');
        imagePreview.innerHTML = '';
        
        if (product.image_path) {
            const img = document.createElement('img');
            img.src = product.image_path;
            img.alt = product.name;
            imagePreview.appendChild(img);
        }
    } else {
        modalTitle.textContent = 'Add New Product';
        productForm.reset();
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('productId').value = '';
    }
    
    productModal.style.display = 'block';
}

// Close product modal
function closeProductModal() {
    productModal.style.display = 'none';
}

// Toggle sale price field
function toggleSalePrice() {
    salePriceGroup.style.display = this.checked ? 'block' : 'none';
}

// Handle product form submission
function handleProductSubmit(e) {
    e.preventDefault();
    
    const productId = document.getElementById('productId').value;
    const isEdit = !!productId;
    
    const formData = new FormData();
    formData.append('action', isEdit ? 'update_product' : 'add_product');
    
    if (isEdit) {
        formData.append('product_id', productId);
    }
    
    formData.append('name', document.getElementById('productName').value);
    formData.append('description', document.getElementById('productDescription').value);
    formData.append('price', document.getElementById('productPrice').value);
    formData.append('category', document.getElementById('productCategory').value);
    formData.append('stock_quantity', document.getElementById('productStock').value);
    formData.append('is_on_sale', document.getElementById('productOnSale').checked ? '1' : '0');
    
    if (document.getElementById('productOnSale').checked) {
        formData.append('sale_price', document.getElementById('productSalePrice').value);
    }
    
    const imageInput = document.getElementById('productImage');
    if (imageInput.files.length > 0) {
        formData.append('image', imageInput.files[0]);
    }
    
    // Show loading state
    const submitBtn = productForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    // Send request to server
    fetch('products.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
            closeProductModal();
            loadProducts();
        } else {
            alert(data.message || 'Failed to save product');
        }
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    });
}

// Edit product
function editProduct(productId) {
    fetch('products.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const product = data.products.find(p => p.id == productId);
                if (product) {
                    openProductModal(product);
                } else {
                    alert('Product not found');
                }
            } else {
                alert('Failed to load product details');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        });
}

// Delete product
function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
    const formData = new FormData();
    formData.append('action', 'delete_product');
    formData.append('product_id', productId);
    
    fetch('products.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
            loadProducts();
        } else {
            alert(data.message || 'Failed to delete product');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    });
}

// Handle logout
function handleLogout() {
    fetch('auth.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'action=logout'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            localStorage.removeItem('is_admin');
            window.location.href = 'auth.html';
        } else {
            alert('Logout failed');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}