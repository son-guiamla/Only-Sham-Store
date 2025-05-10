<?php
require_once 'includes/config.php';

// Check if admin is logged in - more robust check
if (!isset($_SESSION['admin']) || empty($_SESSION['admin'])) {
    header('Location: admin-login.php');
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="css/admin.css">
</head>
<body class="admin-body">
<aside class="admin-sidebar">
        <div class="sidebar-header">
            <h2><i class="fas fa-crown"></i> <span>Admin Panel</span></h2>
        </div>
        <nav class="sidebar-menu">
            <a href="#" class="active" data-section="dashboard">
                <i class="fas fa-tachometer-alt"></i>
                <span>Dashboard</span>
            </a>
            <a href="#" data-section="products">
                <i class="fas fa-tshirt"></i>
                <span>Products</span>
            </a>
            <a href="#" data-section="reservations">
                <i class="fas fa-calendar-check"></i>
                <span>Reservations</span>
            </a>
            <a href="#" data-section="orders">
                <i class="fas fa-shopping-bag"></i>
                <span>Order History</span>
            </a>
            <a href="#" data-section="users">
                <i class="fas fa-users"></i>
                <span>Users</span>
            </a>
            <a href="#" data-section="feedback">
                <i class="fas fa-comment-alt"></i>
                <span>Feedback</span>
            </a>
            <a href="#" data-section="flashsales">
                <i class="fas fa-bolt"></i>
                <span>Flash Sales</span>
            </a>
        </nav>
    </aside>

    <!-- Main Content Area -->
    <main class="admin-main-content">
        <!-- Header -->
        <header class="admin-header">
            <h1>Dashboard Overview</h1>
            <button id="logout-btn" class="admin-logout-btn">
                <i class="fas fa-sign-out-alt"></i>
                <span>Logout</span>
            </button>
        </header>

        <!-- Dashboard Section (Default Visible) -->
        <section id="dashboard-section" style="display: block;">
            <!-- Stats Cards -->
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
                    <h3>Total Revenue</h3>
                    <div class="value" id="total-revenue">₱0.00</div>
                </div>
            </div>

            <!-- Charts -->
            <div class="admin-charts">
                <div class="chart-container">
                    <h3>Monthly Sales</h3>
                    <canvas id="salesChart"></canvas>
                </div>
                <div class="chart-container">
                    <h3>Reservation Status</h3>
                    <canvas id="reservationStatusChart"></canvas>
                </div>
            </div>
        </section>

        <!-- Products Section -->
        <section id="products-section" style="display: none;">
            <div class="admin-table-container">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px;">
                    <h2>Product Management</h2>
                    <button id="add-product-btn" class="admin-btn admin-btn-primary">
                        <i class="fas fa-plus"></i> Add Product
                    </button>
                </div>
                <table id="products-table" class="admin-table">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Name</th>
                            <th>Price</th>
                            <th>Category</th>
                            <th>Sizes/Quantities</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Products will be loaded here dynamically -->
                    </tbody>
                </table>
            </div>
        </section>

        <!-- Reservations Section -->
        <section id="reservations-section" style="display: none;">
            <div class="admin-table-container">
                <h2 style="padding: 15px;">Reservation Management</h2>
                <table id="reservations-table" class="admin-table">
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Product</th>
                            <th>Size</th>
                            <th>Qty</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Picked At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Reservations will be loaded here dynamically -->
                    </tbody>
                </table>
            </div>
        </section>

        <!-- Order History Section -->
        <section id="orders-section" style="display: none;">
            <div class="admin-table-container">
                <h2 style="padding: 15px;">Order History</h2>
                <table id="orders-table" class="admin-table">
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Product</th>
                            <th>Size</th>
                            <th>Qty</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Picked At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Orders will be loaded here dynamically -->
                    </tbody>
                </table>
            </div>
        </section>

        <!-- Users Section -->
        <section id="users-section" style="display: none;">
            <div class="admin-table-container">
                <h2 style="padding: 15px;">User Management</h2>
                <table id="users-table" class="admin-table">
                    <thead>
                        <tr>
                            <th>Full Name</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Active</th>
                            <th>Picked</th>
                            <th>Expired</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Users will be loaded here dynamically -->
                    </tbody>
                </table>
            </div>
        </section>

        <!-- Feedback Section -->
        <section id="feedback-section" style="display: none;">
            <div class="admin-table-container">
                <h2 style="padding: 15px;">Customer Feedback</h2>
                <table id="feedback-table" class="admin-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Profile</th>
                            <th>Rating</th>
                            <th>Comment</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Feedback will be loaded here dynamically -->
                    </tbody>
                </table>
            </div>
        </section>

        <!-- Flash Sales Section -->
        <section id="flashsales-section" style="display: none;">
            <div class="admin-table-container">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px;">
                    <h2>Flash Sales</h2>
                    <button id="add-flashsale-btn" class="admin-btn admin-btn-primary">
                        <i class="fas fa-plus"></i> Add Flash Sale
                    </button>
                </div>
                <table id="flashsales-table" class="admin-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Scope</th>
                            <th>Discount</th>
                            <th>Start Time</th>
                            <th>End Time</th>
                            <th>Time Left</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Flash sales will be loaded here dynamically -->
                    </tbody>
                </table>
            </div>
        </section>
    </main>

    <!-- Product Modal -->
    <div id="product-modal" class="admin-modal">
        <div class="admin-modal-content">
            <div class="admin-modal-header">
                <h2 id="product-modal-title">Add New Product</h2>
                <button class="admin-close-btn">&times;</button>
            </div>
            <form id="product-form" enctype="multipart/form-data">
                <input type="hidden" id="product-id" name="id">
                <input type="hidden" name="action" value="save_product">
                
                <div class="admin-form-group">
                    <label for="product-name">Product Name</label>
                    <input type="text" id="product-name" name="name" required autocomplete="off">
                </div>
                
                <div class="admin-form-group">
                    <label for="product-price">Price (₱)</label>
                    <input type="number" id="product-price" name="price" step="0.01" min="0" required autocomplete="off">
                </div>
                
                <div class="admin-form-group">
                    <label for="product-category">Category</label>
                    <select id="product-category" name="category" required autocomplete="off">
                        <option value="T-Shirts">T-Shirts</option>
                        <option value="Shoes">Shoes</option>
                        <option value="Jeans">Jeans</option>
                        <option value="Shorts">Shorts</option>
                    </select>
                </div>
                
                <div class="admin-form-group">
                    <label for="product-description">Description</label>
                    <textarea id="product-description" name="description" rows="3" autocomplete="off"></textarea>
                </div>
                
                <div class="admin-form-group">
                    <label for="product-image">Product Image</label>
                    <input type="file" id="product-image" name="image" accept="image/*" autocomplete="off">
                    <div id="image-preview" style="margin-top: 10px;"></div>
                </div>
                
                <div class="admin-form-group">
                    <label>Sizes & Quantities</label>
                    <div class="admin-size-quantities">
                        <!-- Size inputs will be added here dynamically -->
                    </div>
                    <button type="button" id="add-size-btn" class="admin-btn admin-btn-secondary">
                        <i class="fas fa-plus"></i> Add Size
                    </button>
                </div>
                
                <div class="admin-form-group">
                    <label for="product-featured">
                        <input type="checkbox" id="product-featured" name="featured"> Featured Product
                    </label>
                </div>
                
                <div class="admin-form-actions">
                    <button type="button" class="admin-btn admin-btn-secondary admin-close-btn">Cancel</button>
                    <button type="submit" class="admin-btn admin-btn-primary">Save Product</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Flash Sale Modal -->
    <div id="flashsale-modal" class="admin-modal">
        <div class="admin-modal-content">
            <div class="admin-modal-header">
                <h2 id="flashsale-modal-title">Add Flash Sale</h2>
                <button class="admin-close-btn">&times;</button>
            </div>
            <form id="flashsale-form">
                <input type="hidden" id="flashsale-id" name="id">
                
                <div class="admin-form-group">
                    <label for="flashsale-name">Sale Name</label>
                    <input type="text" id="flashsale-name" name="name" required autocomplete="off">
                </div>
                
                <div class="admin-form-group">
                    <label for="flashsale-scope">Scope</label>
                    <select id="flashsale-scope" name="scope" required autocomplete="off">
                        <option value="products">Specific Products</option>
                        <option value="categories">Product Categories</option>
                    </select>
                </div>
                
                <div id="products-selector" class="admin-form-group" style="display: block;">
                    <label>Select Products</label>
                    <div id="products-checkboxes" class="admin-checkbox-container">
                        <!-- Product checkboxes will be loaded here dynamically -->
                    </div>
                </div>
                
                <div id="categories-selector" class="admin-form-group" style="display: none;">
                    <label>Select Categories</label>
                    <div id="categories-checkboxes" class="admin-checkbox-container">
                        <!-- Category checkboxes will be loaded here dynamically -->
                    </div>
                </div>
                
                <div class="admin-form-group">
                    <label for="flashsale-discount-type">Discount Type</label>
                    <select id="flashsale-discount-type" name="discount_type" required autocomplete="off">
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed Amount</option>
                    </select>
                </div>
                
                <div class="admin-form-group">
                    <label for="flashsale-discount-value">Discount Value</label>
                    <div style="display: flex; align-items: center;">
                        <span id="discount-symbol" style="margin-right: 5px;">%</span>
                        <input type="number" id="flashsale-discount-value" name="discount_value" min="0" step="0.01" required autocomplete="off">
                    </div>
                </div>
                
                <div class="admin-form-group">
                    <label for="flashsale-start">Start Time</label>
                    <input type="datetime-local" id="flashsale-start" name="start_time" required autocomplete="off">
                </div>
                
                <div class="admin-form-group">
                    <label for="flashsale-end">End Time</label>
                    <input type="datetime-local" id="flashsale-end" name="end_time" required autocomplete="off">
                </div>
                
                <div class="admin-form-actions">
                    <button type="button" class="admin-btn admin-btn-secondary admin-close-btn">Cancel</button>
                    <button type="submit" class="admin-btn admin-btn-primary">Save Flash Sale</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Loading Spinner -->
    <div id="loading-spinner" class="loading-spinner" style="display: none;"></div>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js"></script>
    <script src="js/admin.js"></script>
</body>
</html>