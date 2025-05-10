<?php
require_once 'includes/config.php';

// Check if user is logged in
$userLoggedIn = isset($_SESSION['user']);
$adminLoggedIn = isset($_SESSION['admin']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shoes | Only@Sham</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <nav class="navbar">
        <!-- Logo -->
        <div class="logo">
            <a href="index.php">Only@Sham</a>
        </div>

        <!-- Menu Links -->
        <ul class="nav-links">
            <li><a href="index.php">Home</a></li>
            <li><a href="#product-grid">Shop</a></li>
            <li><a href="cart.php">Reservations</a></li>
            <li><a href="#about-us">About Us</a></li>
            <li><a href="#Contact">Contact</a></li>
        </ul>

        <!-- Search Bar -->
        <div class="search-bar">
            <input type="text" placeholder="Search...">
            <button><i class="fas fa-search"></i></button>
            <div id="search-results-message" class="search-message"></div>
        </div>

        <!-- Icons -->
        <div class="nav-icons">
            <a href="cart.php" class="cart-icon"><i class="fas fa-shopping-cart"><sup><span id="cart-count">0</span></sup></i></a>
            <a href="profile.php" class="profile-icon"><i class="fas fa-user"></i></a>
            <div class="settings-icon" onclick="toggleSidebar()">
                <i class="fas fa-ellipsis-v"></i>
            </div>
        </div>

        <!-- Sidebar -->
        <div class="sidebar" id="sidebar">
            <a href="#" class="close-btn" onclick="toggleSidebar()">&times;</a>
            <?php if ($userLoggedIn || $adminLoggedIn): ?>
                <a href="#" onclick="logout()">Logout</a>
            <?php else: ?>
                <a href="login.php">Login</a>
            <?php endif; ?>
            <a href="#" class="sidebar-link settings-link">Settings</a>
            <a href="#" class="sidebar-link help-link">Help</a>
        </div>
    </nav>

    <!-- Category Header -->
    <section class="category-header">
        <div class="category-banner" style="background-image: url('assets/shoes-banner.jpg')">
            <h1>Shoes Collection</h1>
            <p>Step up your style with our premium selection of shoes.</p>
        </div>
    </section>

    <!-- Products Section -->
    <section id="shop" class="category-products">
        <div class="product-grid" id="product-grid">
            <!-- Products will be loaded here by JavaScript -->
        </div>
    </section>

    <!-- Product Detail Modal -->
    <div id="productModal" class="modal">
        <span class="close-modal">&times;</span>
        <div class="modal-content">
            <div class="product-detail">
                <div class="product-detail-images">
                    <img id="modalProductImage" src="" alt="">
                    <div id="quickViewSaleBadge" class="product-badge" style="display: none;">Sale</div>
                </div>
                <div class="product-detail-info">
                    <h2 id="modalProductTitle">Product Title</h2>
                    <div class="product-price-large" id="modalProductPrice">₱0.00</div>
                    <p class="product-description" id="modalProductDescription">
                        Product description will be loaded here.
                    </p>
                    <div class="product-options">
                        <div class="option-group">
                            <h4>Size</h4>
                            <div class="size-options" id="quickViewSizes">
                                <!-- Size options will be loaded here -->
                            </div>
                        </div>
                    </div>
                    <div class="detail-actions">
                        <button class="btn" id="reserveInModal">Reserve Now</button>
                        <button class="btn" id="addToCartBtn" style="background-color: var(--secondary-color); color: var(--dark-color);">Add to Cart</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Footer Section -->
    <footer class="footer">
        <div class="footer-content">
            <!-- Footer Links -->
            <div class="footer-links">
                <h3>Quick Links</h3>
                <ul>
                    <li><a href="#">Privacy Policy</a></li>
                    <li><a href="#">Terms & Conditions</a></li>
                    <li><a href="#">Return Policy</a></li>
                </ul>
            </div>

            <!-- Social Media Icons -->
            <div class="social-media" id="Contact">
                <h3>Follow Us</h3>
                <div class="social-icons">
                    <a href="https://www.facebook.com/share/1FMLtsgqFB/?mibextid=qi2Omg" class="social-icon"><i class="fab fa-facebook-f"></i></a>
                    <a href="#" class="social-icon"><i class="fab fa-instagram"></i></a>
                    <a href="#" class="social-icon"><i class="fab fa-tiktok"></i></a>
                </div>
            </div>
        </div>

        <!-- Footer Bottom -->
        <div class="footer-bottom">
            <p>&copy; 2025 Only@Sham. All rights reserved.</p>
        </div>
    </footer>

    <script>
        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('active');
        }

        function logout() {
            fetch('includes/auth.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'action=logout'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = 'index.php';
                }
            });
        }

        // Check login status on page load
        window.onload = function () {
            <?php if ($userLoggedIn): ?>
                enableAddToCartButtons();
                updateCartCount();
            <?php endif; ?>
            // Load products for shoes category
            loadProducts('shoes');
        };

        // Enable "Add to Cart" buttons
        function enableAddToCartButtons() {
            const addToCartButtons = document.querySelectorAll(".add-to-cart");
            addToCartButtons.forEach((button) => {
                button.disabled = false;
            });
        }

        // Update cart count
        function updateCartCount() {
            fetch('includes/cart.php?action=get_cart')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const totalItems = data.data.filter(item => 
                            !item.status || item.status === 'pending'
                        ).reduce((sum, item) => sum + item.quantity, 0);
                        document.getElementById('cart-count').textContent = totalItems;
                    }
                });
        }

        // Handle storage events for product updates
        window.addEventListener('storage', function(e) {
            if (e.key === 'products_updated') {
                loadProducts('shoes');
            }
        });

        // Update cart count on DOM content loaded
        document.addEventListener('DOMContentLoaded', function() {
            updateCartCount();
        });
    </script>
    <script src="js/script.js"></script>
    <script src="js/auth.js"></script>
</body>
</html>