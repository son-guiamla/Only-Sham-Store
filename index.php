<?php
session_start();
$isLoggedIn = isset($_SESSION['user_id']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Only@Sham</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <nav class="navbar">
        <div class="logo">
            <a href="#">Only@Sham</a>
        </div>

        <ul class="nav-links">
            <li><a href="#hero">Home</a></li>
            <li><a href="#product-grid">Shop</a></li>
            <li><a href="cart.php">Reservations</a></li>
            <li><a href="#about-us">About Us</a></li>
            <li><a href="#Contact">Contact</a></li>
        </ul>

        <div class="search-bar">
            <input type="text" placeholder="Search...">
            <button><i class="fas fa-search"></i></button>
            <div id="search-results-message" class="search-message"></div>
        </div>

        <div class="nav-icons">
            <a href="cart.php" class="cart-icon">
                <i class="fas fa-shopping-cart"></i><sup><span id="cart-count">0</span></sup>
            </a>
            <a href="profile.php" class="profile-icon"><i class="fas fa-user"></i></a>
            <div class="settings-icon" onclick="toggleSidebar()">
                <i class="fas fa-ellipsis-v"></i>
            </div>
        </div>
    </nav>

    <!-- Sidebar -->
    <div class="sidebar" id="sidebar">
        <a href="#" class="close-btn" onclick="toggleSidebar()">&times;</a>
        <a href="profile.php" class="profile-link" style="display:none;">
            <i class="fas fa-user"></i> Profile
        </a>
        <a href="login.php" class="login-link">
            <i class="fas fa-sign-in-alt"></i> Login
        </a>
        <a href="#" class="logout-link" style="display:none;" onclick="logout()">
            <i class="fas fa-sign-out-alt"></i> Logout
        </a>
    <a href="#" class="sidebar-link settings-link">Settings</a>
    <a href="#" class="sidebar-link help-link">Help</a>
    </div>
    

    <!-- Hero Section -->
    <section id="hero" class="hero">
        <div class="hero-content">
            <h1>Discover the Latest Trends</h1>
            <p>Upgrade your style with our exclusive collection of trendy products.</p>
            <a href="#product-grid" class="shop-now-btn">Shop Now</a>
        </div>
    </section>

    <!-- Product Grid -->
    <section class="product-section">
        <div class="product-grid" id="product-grid">
            <!-- Products will be loaded here -->
        </div>
    </section>

    <!-- Product Categories -->
    <section class="product-categories">
        <div class="container">
            <h2>Shop by Category</h2>
            <div class="category-grid">
                <div class="category-card">
                    <a href="t-shirts.php">
                        <img src="assets/Shirt.png" alt="T-Shirts" width="60" height="60">
                        <h3>T-Shirts</h3>
                    </a>
                </div>
                <div class="category-card">
                    <a href="jeans.php">
                        <img src="assets/jeans.svg" alt="Jeans" width="60" height="60">
                        <h3>Jeans</h3>
                    </a>
                </div>
                <div class="category-card">
                    <a href="shoes.php">
                        <img src="assets/shoes.png" alt="Shoes" width="60" height="60">
                        <h3>Shoes</h3>
                    </a>
                </div>
                <div class="category-card">
                    <a href="shorts.php">
                        <img src="assets/short.png" alt="Shorts" width="60" height="60">
                        <h3>Shorts</h3>
                    </a>
                </div>
            </div>
        </div>
    </section>

    <!-- Promo Banner -->
    <section class="promo-banner">
        <div class="promo-container">
            <img src="assets/newarrival.jpg" alt="Summer Sale - Up to 70% OFF" class="promo-image">
            <div class="promo-badge"><span>Only@Sham Exclusive</span></div>
            <div class="promo-discount"><span>UP TO 70% OFF</span></div>
            <div class="promo-dates"><span>JUN 10 – JUL 24, 2025</span></div>
            <a href="#product-grid" class="promo-button">Shop Now</a>
        </div>
    </section>

    <!-- About Us Section -->
    <section id="about-us" class="about-us">
        <div class="container">
            <div class="about-content">
                <div class="about-text">
                    <h2>About Us</h2>
                    <p class="intro">
                        Welcome to <strong>Only@Sham</strong>, your go-to destination for the latest trends in fashion, electronics, and lifestyle products. We are passionate about delivering high-quality products that inspire and empower our customers.
                    </p>
                    <p class="unique">
                        What makes us unique is our commitment to sustainability, exceptional customer service, and a curated selection of products that cater to your every need. We believe in making shopping an enjoyable and seamless experience for everyone.
                    </p>
                </div>
                <div class="about-image">
                    <img src="assets/about us.jpg" alt="Our Team">
                    <div class="image-overlay"></div>
                </div>
            </div>
        </div>
    </section>

    <!-- Flash Sale Section -->
    <section id="flash-sale" class="flash-sale-section">
        <div id="flash-sale-container" class="container">
            <!-- Flash sale content will be loaded here -->
        </div>
    </section>

    <!-- Shop Reviews -->
    <section id="shop-reviews" class="shop-reviews">
        <div class="container">
            <h2>Customer Reviews</h2>
            <div class="reviews-container" id="reviews-container"></div>
            <div class="add-review">
                <h3>Leave Your Review</h3>
                <div class="rating">
                    <span>Rating:</span>
                    <div class="stars">
                        <i class="far fa-star" data-rating="1"></i>
                        <i class="far fa-star" data-rating="2"></i>
                        <i class="far fa-star" data-rating="3"></i>
                        <i class="far fa-star" data-rating="4"></i>
                        <i class="far fa-star" data-rating="5"></i>
                    </div>
                    <span class="rating-text">0/5</span>
                </div>
                <textarea id="review-comment" placeholder="Share your experience..."></textarea>
                <button id="submit-review" class="btn-primary">Submit Review</button>
            </div>
        </div>
    </section>

    <!-- Product Modal -->
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
                    <p class="product-description" id="modalProductDescription">Product description will be loaded here.</p>
                    <div class="product-options">
                        <div class="option-group">
                            <h4>Size</h4>
                            <div class="size-options" id="quickViewSizes"></div>
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

    <!-- Footer -->
    <footer class="footer">
        <div class="footer-content">
            <div class="footer-links">
                <h3>Quick Links</h3>
                <ul>
                    <li><a href="#">Privacy Policy</a></li>
                    <li><a href="#">Terms & Conditions</a></li>
                    <li><a href="#">Return Policy</a></li>
                </ul>
            </div>

            <section id="Contact" class="social-media">
                <h3>Follow Us</h3>
                <div class="social-icons">
                    <a href="https://www.facebook.com/share/1FMLtsgqFB/?mibextid=qi2Omg" class="social-icon"><i class="fab fa-facebook-f"></i></a>
                    <a href="#" class="social-icon"><i class="fab fa-instagram"></i></a>
                    <a href="#" class="social-icon"><i class="fab fa-tiktok"></i></a>
                </div>
            </section>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2025 Only@Sham. All rights reserved.</p>
        </div>
    </footer>

    <!-- Scripts -->
    <script src="script.js"></script>
    <script src="products.js"></script>
    <script>
        // Logout function
        function logout() {
            fetch('logout.php')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        window.location.href = 'index.php';
                    }
                })
                .catch(error => console.error('Error:', error));
        }

        window.onload = function () {
            const loggedInUser = localStorage.getItem("user");
            if (loggedInUser) {
                enableAddToCartButtons();
            }
        };

        function enableAddToCartButtons() {
            const addToCartButtons = document.querySelectorAll(".add-to-cart");
            addToCartButtons.forEach(button => button.disabled = false);
        }

        window.addEventListener('storage', function (e) {
            if (e.key === 'products') {
                loadProducts();
            }
        });

        // Toggle sidebar function
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('active');
        }
    </script>
</body>
</html>