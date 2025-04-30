<?php
require_once 'config.php';
session_start();

// Check if admin is logged in
if (!isset($_SESSION['user_id']) || !$_SESSION['is_admin']) {
    header('Location: login.php');
    exit();
}

// Get admin user data
$adminId = $_SESSION['user_id'];
$stmt = $conn->prepare("SELECT * FROM users WHERE user_id = ?");
$stmt->execute([$adminId]);
$adminUser = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$adminUser) {
    session_destroy();
    header('Location: login.php');
    exit();
}

// Handle AJAX requests
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    header('Content-Type: application/json');
    
    switch ($_POST['action']) {
        case 'get_dashboard_data':
            echo json_encode(getDashboardData($conn));
            exit();
        case 'get_products':
            echo json_encode(getProducts($conn));
            exit();
        case 'get_reservations':
            echo json_encode(getReservations($conn));
            exit();
        case 'get_users':
            echo json_encode(getUsers($conn));
            exit();
        case 'get_feedback':
            echo json_encode(getFeedback($conn));
            exit();
        case 'get_orders':
            echo json_encode(getOrders($conn));
            exit();
        case 'get_flash_sales':
            echo json_encode(getFlashSales($conn));
            exit();
        // Add more cases for other actions
    }
}

function getDashboardData($conn) {
    // Implement your dashboard data retrieval
    $data = [
        'total_products' => 0,
        'total_users' => 0,
        'active_reservations' => 0,
        'picked_orders' => 0,
        'total_revenue' => 0,
        'sales_data' => [],
        'reservation_status_data' => []
    ];
    
    // Get total products
    $stmt = $conn->query("SELECT COUNT(*) FROM products");
    $data['total_products'] = $stmt->fetchColumn();
    
    // Get total users
    $stmt = $conn->query("SELECT COUNT(*) FROM users");
    $data['total_users'] = $stmt->fetchColumn();
    
    // Get active reservations
    $stmt = $conn->query("SELECT COUNT(*) FROM reservations WHERE status IN ('reserved', 'confirmed')");
    $data['active_reservations'] = $stmt->fetchColumn();
    
    // Get picked orders
    $stmt = $conn->query("SELECT COUNT(*) FROM reservations WHERE status = 'completed'");
    $data['picked_orders'] = $stmt->fetchColumn();
    
    // Get total revenue
    $stmt = $conn->query("SELECT SUM(total_price) FROM reservations WHERE status = 'completed'");
    $data['total_revenue'] = $stmt->fetchColumn() ?? 0;
    
    // Get sales data (example - adjust as needed)
    $stmt = $conn->query("SELECT MONTH(created_at) as month, SUM(total_price) as total 
                         FROM reservations 
                         WHERE status = 'completed' 
                         GROUP BY MONTH(created_at)");
    $salesData = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $monthlySales = array_fill(1, 12, 0);
    foreach ($salesData as $sale) {
        $monthlySales[$sale['month']] = (float)$sale['total'];
    }
    $data['sales_data'] = array_values($monthlySales);
    
    // Get reservation status data
    $statusData = [
        'pending' => 0,
        'reserved' => 0,
        'confirmed' => 0,
        'completed' => 0,
        'expired' => 0
    ];
    
    $stmt = $conn->query("SELECT status, COUNT(*) as count FROM reservations GROUP BY status");
    $statusCounts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($statusCounts as $count) {
        $statusData[$count['status']] = (int)$count['count'];
    }
    
    $data['reservation_status_data'] = array_values($statusData);
    
    return ['success' => true, 'data' => $data];
}

// Implement similar functions for other data retrieval (products, reservations, users, etc.)

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard | Only@Sham</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.css">
    <style>
        /* Keep all the existing CSS styles from admin-dashboard.html */
        <?php include 'admin-styles.css'; ?>
    </style>
</head>
<body class="admin-body">
    <!-- Sidebar -->
    <div class="admin-sidebar">
        <div class="sidebar-header">
            <h2><i class="fas fa-cog"></i> <span>Admin Panel</span></h2>
        </div>
        <div class="sidebar-menu">
            <a href="#" class="active" data-section="dashboard"><i class="fas fa-tachometer-alt"></i> <span>Dashboard</span></a>
            <a href="#" data-section="products"><i class="fas fa-tshirt"></i> <span>Products</span></a>
            <a href="#" data-section="reservations"><i class="fas fa-calendar-check"></i> <span>Reservations</span></a>
            <a href="#" data-section="orders"><i class="fas fa-shopping-bag"></i> <span>Order History</span></a>
            <a href="#" data-section="users"><i class="fas fa-users"></i> <span>Users</span></a>
            <a href="#" data-section="feedback"><i class="fas fa-comment-alt"></i> <span>Feedback</span></a>
            <a href="#" data-section="flashsales"><i class="fas fa-bolt"></i> <span>Flash Sales</span></a>
        </div>
    </div>

    <!-- Main Content -->
    <div class="admin-main-content">
        <div class="admin-header">
            <h1>Dashboard Overview</h1>
            <button class="admin-logout-btn" id="logout-btn"><i class="fas fa-sign-out-alt"></i> Logout</button>
        </div>

        <!-- Dashboard Section -->
        <div class="dashboard-section" id="dashboard-section">
            <div class="dashboard-cards">
                <div class="admin-card">
                    <h3>Total Products</h3>
                    <div class="value" id="total-products">0</div>
                </div>
                <div class="admin-card">
                    <h3>Total Users</h3>
                    <div class="value" id="total-users">0</div>
                </div>
                <div class="admin-card">
                    <h3>Active Reservations</h3>
                    <div class="value" id="active-reservations">0</div>
                </div>
                <div class="admin-card">
                    <h3>Picked Orders</h3>
                    <div class="value" id="picked-orders">0</div>
                </div>
                <div class="admin-card">
                    <h3>Revenue</h3>
                    <div class="value" id="total-revenue">₱0.00</div>
                </div>
            </div>

            <div class="admin-charts">
                <div class="chart-container">
                    <canvas id="salesChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="reservationStatusChart"></canvas>
                </div>
            </div>
        </div>

        <!-- Products Section -->
        <div class="products-section" id="products-section" style="display: none;">
            <div class="admin-header">
                <h1>Product Management</h1>
                <button class="admin-btn admin-btn-primary" id="add-product-btn"><i class="fas fa-plus"></i> Add Product</button>
            </div>
            
            <div class="admin-table-container">
                <table class="admin-table" id="products-table">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Name</th>
                            <th>Price</th>
                            <th>Category</th>
                            <th>Sizes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Products will be loaded here by JavaScript -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Reservations Section -->
        <div class="reservations-section" id="reservations-section" style="display: none;">
            <div class="admin-header">
                <h1>Reservation Management</h1>
            </div>
            
            <div class="admin-table-container">
                <table class="admin-table" id="reservations-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Product</th>
                            <th>Size</th>
                            <th>Quantity</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Picked Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Reservations will be loaded here by JavaScript -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Order History Section -->
        <div class="orders-section" id="orders-section" style="display: none;">
            <div class="admin-header">
                <h1>Order History</h1>
            </div>
            
            <div class="admin-table-container">
                <table class="admin-table" id="orders-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Product</th>
                            <th>Size</th>
                            <th>Quantity</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Picked Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Orders will be loaded here by JavaScript -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Users Section -->
        <div class="users-section" id="users-section" style="display: none;">
            <div class="admin-header">
                <h1>User Management</h1>
            </div>
            
            <div class="admin-table-container">
                <table class="admin-table" id="users-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Reservations</th>
                            <th>Orders</th>
                            <th>Expired</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Users will be loaded here by JavaScript -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Feedback Section -->
        <div class="feedback-section" id="feedback-section" style="display: none;">
            <div class="admin-header">
                <h1>Customer Feedback</h1>
            </div>
            
            <div class="admin-table-container">
                <table class="admin-table" id="feedback-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Profile</th>
                            <th>Rating</th>
                            <th>Comment</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Feedback will be loaded here by JavaScript -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Flash Sales Section -->
        <div class="flashsales-section" id="flashsales-section" style="display: none;">
            <div class="admin-header">
                <h1>Flash Sale Management</h1>
                <button class="admin-btn admin-btn-primary" id="add-flashsale-btn"><i class="fas fa-plus"></i> Add Flash Sale</button>
            </div>
            
            <div class="admin-table-container">
                <table class="admin-table" id="flashsales-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Scope</th>
                            <th>Discount</th>
                            <th>Start</th>
                            <th>End</th>
                            <th>Time Left</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Flash sales will be loaded here by JavaScript -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>


       <!-- Product Modal -->
    <div class="admin-modal" id="product-modal">
        <div class="admin-modal-content">
            <div class="admin-modal-header">
                <h2 id="product-modal-title">Add New Product</h2>
                <button class="admin-close-btn">&times;</button>
            </div>
            <form id="product-form">
                <input type="hidden" id="product-id">
                <div class="admin-form-group">
                    <label for="product-name">Product Name</label>
                    <input type="text" id="product-name" required>
                </div>
                <div class="admin-form-group">
                    <label for="product-price">Price</label>
                    <input type="number" id="product-price" step="0.01" required>
                </div>
                <div class="admin-form-group">
                    <label for="product-category">Category</label>
                    <select id="product-category" required>
                        <option value="T-Shirts">T-Shirts</option>
                        <option value="Jeans">Jeans</option>
                        <option value="Shoes">Shoes</option>
                        <option value="Shorts">Shorts</option>
                    </select>
                </div>
                <div class="admin-form-group">
                    <label for="product-image">Product Image</label>
                    <input type="file" id="product-image" accept="image/*">
                    <div id="image-preview" style="margin-top: 10px;"></div>
                </div>
                <div class="admin-form-group">
                    <label for="product-description">Description</label>
                    <textarea id="product-description" rows="3"></textarea>
                </div>
                <div class="admin-form-group">
                    <label class="admin-checkbox-item">
                        <input type="checkbox" id="product-featured"> 
                        <span>Feature this product on main shop page</span>
                    </label>
                </div>
                <div class="admin-form-group">
                    <label>Size Quantities</label>
                    <div class="admin-size-quantities">
                        <!-- Size inputs will be added here -->
                    </div>
                    <button type="button" class="admin-btn admin-btn-secondary" id="add-size-btn">Add Size</button>
                </div>
                <div class="admin-form-actions">
                    <button type="button" class="admin-btn admin-btn-secondary admin-close-btn">Cancel</button>
                    <button type="submit" class="admin-btn admin-btn-primary">Save</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Flash Sale Modal -->
    <div class="admin-modal" id="flashsale-modal">
        <div class="admin-modal-content">
            <div class="admin-modal-header">
                <h2 id="flashsale-modal-title">Create Flash Sale</h2>
                <button class="admin-close-btn">&times;</button>
            </div>
            <form id="flashsale-form">
                <input type="hidden" id="flashsale-id">
                <div class="admin-form-group">
                    <label for="flashsale-name">Sale Name</label>
                    <input type="text" id="flashsale-name" required>
                </div>
                <div class="admin-form-group">
                    <label for="flashsale-scope">Scope</label>
                    <select id="flashsale-scope" required>
                        <option value="products">Specific Products</option>
                        <option value="categories">Specific Categories</option>
                        <option value="all">All Products</option>
                    </select>
                </div>
                <div class="admin-form-group" id="products-selector" style="display: none;">
                    <label>Select Products</label>
                    <div id="products-checkboxes" style="max-height: 200px; overflow-y: auto;"></div>
                </div>
                <div class="admin-form-group" id="categories-selector" style="display: none;">
                    <label>Select Categories</label>
                    <div id="categories-checkboxes" style="max-height: 200px; overflow-y: auto;"></div>
                </div>
                <div class="admin-form-group">
                    <label for="flashsale-discount-type">Discount Type</label>
                    <select id="flashsale-discount-type" required>
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed Amount</option>
                    </select>
                </div>
                <div class="admin-form-group">
                    <label for="flashsale-discount-value">Discount Value</label>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span id="discount-symbol">%</span>
                        <input type="number" id="flashsale-discount-value" min="1" required style="flex: 1;">
                    </div>
                </div>
                <div class="admin-form-group">
                    <label for="flashsale-start">Start Date & Time</label>
                    <input type="datetime-local" id="flashsale-start" required>
                </div>
                <div class="admin-form-group">
                    <label for="flashsale-end">End Date & Time</label>
                    <input type="datetime-local" id="flashsale-end" required>
                </div>
                <div class="admin-form-actions">
                    <button type="button" class="admin-btn admin-btn-secondary admin-close-btn">Cancel</button>
                    <button type="submit" class="admin-btn admin-btn-primary">Save</button>
                </div>
            </form>
        </div>
    </div>
    </div>

    <script src="admin.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js"></script>
    <script>
    // Updated admin.js with AJAX calls
    document.addEventListener('DOMContentLoaded', function() {
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
                
                // Load section data
                loadSectionData(this.dataset.section);
            });
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', function() {
            fetch('logout.php')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        window.location.href = 'login.php';
                    }
                });
        });

        // Initialize dashboard
        loadSectionData('dashboard');

        // Modal functionality and other event listeners...
    });

    function loadSectionData(section) {
        const actions = {
            'dashboard': 'get_dashboard_data',
            'products': 'get_products',
            'reservations': 'get_reservations',
            'users': 'get_users',
            'feedback': 'get_feedback',
            'orders': 'get_orders',
            'flashsales': 'get_flash_sales'
        };

        fetch('admin-dashboard.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=${actions[section]}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                switch(section) {
                    case 'dashboard':
                        updateDashboard(data.data);
                        break;
                    case 'products':
                        updateProducts(data.data);
                        break;
                    // Add cases for other sections
                }
            }
        });
    }

    function updateDashboard(data) {
        document.getElementById('total-products').textContent = data.total_products;
        document.getElementById('total-users').textContent = data.total_users;
        document.getElementById('active-reservations').textContent = data.active_reservations;
        document.getElementById('picked-orders').textContent = data.picked_orders;
        document.getElementById('total-revenue').textContent = `₱${data.total_revenue.toFixed(2)}`;
        
        // Update charts
        updateCharts(data.sales_data, data.reservation_status_data);
    }

    function updateCharts(salesData, statusData) {
        // Sales chart
        const salesCtx = document.getElementById('salesChart').getContext('2d');
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
        
        // Reservation status chart
        const statusCtx = document.getElementById('reservationStatusChart').getContext('2d');
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

    // Implement similar functions for other sections (products, reservations, etc.)
    </script>
</body>
</html>