<?php
require_once 'includes/config.php';

// Ensure session is started
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Check if user is logged in and validate ban status
$userLoggedIn = isset($_SESSION['user']);
$adminLoggedIn = isset($_SESSION['admin']);
if ($userLoggedIn) {
    $stmt = $pdo->prepare("SELECT banned FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user']['id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($user && $user['banned']) {
        // Clear session for banned user
        $_SESSION = [];
        session_destroy();
        $userLoggedIn = false;
        header("Location: login.php");
        exit;
    }
}

// Fetch featured products
try {
    $stmt = $pdo->query("SELECT * FROM products WHERE featured = 1 AND deleted = 0");
    $featuredProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($featuredProducts as &$product) {
        $product['sizes'] = json_decode($product['sizes'], true) ?: [];
        // Check for active discount
        $stmt = $pdo->prepare("SELECT * FROM discounts WHERE product_id = ? AND start_date <= NOW() AND end_date >= NOW()");
        $stmt->execute([$product['id']]);
        $discount = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($discount) {
            $product['discount_applied'] = [
                'type' => $discount['type'],
                'value' => $discount['value']
            ];
            $product['original_price'] = $product['price'];
            $product['discounted_price'] = $discount['type'] === 'percentage' ?
                $product['price'] * (1 - $discount['value'] / 100) :
                $product['price'] - $discount['value'];
        } else {
            $product['original_price'] = $product['price'];
        }
    }
} catch (PDOException $e) {
    $featuredProducts = [];
    error_log("Error fetching products: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>Only@Sham</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="css/styles.css">
</head>
<style>
.sale-badge {
    position: absolute;
    top: 10px;
    left: 10px;
    background: linear-gradient(45deg, #ff4d4d, #ff8c1a);
    color: #fff;
    font-size: 12px;
    font-weight: bold;
    padding: 5px 10px;
    border-radius: 12px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    z-index: 10;
    animation: pulse 2s infinite;
}

.product-image-container {
    position: relative;
}

@keyframes pulse {
    0% {
        transform: scale(1);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    }
    50% {
        transform: scale(1.05);
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
    }
    100% {
        transform: scale(1);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    }
}
#quickViewSaleBadge {
    background: linear-gradient(45deg, #ff4d4d, #ff8c1a);
    color: #fff;
    font-size: 12px;
    font-weight: bold;
    padding: 5px 10px;
    border-radius: 12px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    animation: pulse 2s infinite;
}
</style>
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
            <a href="cart.php" class="cart-icon"><i class="fas fa-shopping-cart"><sup><span id="cart-count">0</span></sup></i></a>
            <a href="profile.php" class="profile-icon"><i class="fas fa-user"></i></a>
            <div class="settings-icon" onclick="toggleSidebar()">
                <i class="fas fa-ellipsis-v"></i>
            </div>
        </div>
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
    <section id="hero">
        <div class="hero">
            <div class="hero-content">
                <h1>Discover the Latest Trends</h1>
                <p>Upgrade your style with our exclusive collection of trendy products.</p>
                <a href="#product-grid" class="shop-now-btn">Shop Now</a>
            </div>
        </div>
        <section class="featured-products">
            <h2>Featured Products</h2>
            <div class="product-grid" id="product-grid">
                <?php if (empty($featuredProducts)): ?>
                    <div class="empty">No featured products available</div>
                <?php else: ?>
                    <?php foreach ($featuredProducts as $index => $product): ?>
                        <?php
                        $sizes = $product['sizes'] ? array_filter($product['sizes'], fn($qty) => $qty > 0) : [];
                        $totalQuantity = array_sum($product['sizes']);
                        $baseUrl = 'http://localhost/onlyatsham/';
                        $imageSrc = $product['image'] ? $baseUrl . $product['image'] : 'assets/default-product.jpg';
                        ?>
                        <div class="product-card">
                            <div class="product-image-container">
                                <img src="<?php echo htmlspecialchars($imageSrc); ?>" alt="<?php echo htmlspecialchars($product['name']); ?>" class="product-image" onerror="this.src='assets/default-product.jpg'">
                                <?php if ($product['featured']): ?>
                                    <span class="featured-badge">Featured</span>
                                <?php endif; ?>
                                <?php if (isset($product['discount_applied'])): ?>
                                    <span class="sale-badge"><?php echo $product['discount_applied']['type'] === 'percentage' ? "{$product['discount_applied']['value']}% OFF" : "₱{$product['discount_applied']['value']} OFF"; ?></span>
                                <?php endif; ?>
                                <button class="quick-view-btn" data-id="<?php echo htmlspecialchars($product['id']); ?>">
                                    <i class="fas fa-eye"></i> Quick View
                                </button>
                            </div>
                            <h3><?php echo htmlspecialchars($product['name']); ?></h3>
                            <p class="price">
                                <?php if (isset($product['discount_applied'])): ?>
                                    <span class="original-price">₱<?php echo number_format($product['original_price'], 2); ?></span>
                                    <span class="discounted-price">₱<?php echo number_format($product['discounted_price'], 2); ?></span>
                                <?php else: ?>
                                    ₱<?php echo number_format($product['original_price'], 2); ?>
                                <?php endif; ?>
                            </p>
                            <p class="quantity">Quantity: <?php echo $totalQuantity; ?></p>
                            <div class="size-selection">
                                <label for="size-<?php echo $index; ?>">Size:</label>
                                <select id="size-<?php echo $index; ?>" class="size-dropdown" <?php echo empty($sizes) ? 'disabled' : ''; ?>>
                                    <?php if (empty($sizes)): ?>
                                        <option value="">Out of stock</option>
                                    <?php else: ?>
                                        <?php foreach (array_keys($sizes) as $size): ?>
                                            <option value="<?php echo htmlspecialchars($size); ?>"><?php echo htmlspecialchars($size); ?></option>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </select>
                            </div>
                            <button class="add-to-cart" data-id="<?php echo htmlspecialchars($product['id']); ?>" <?php echo empty($sizes) || !$userLoggedIn ? 'disabled' : ''; ?>>
                                <?php echo empty($sizes) ? 'Out of stock' : 'Add to Cart'; ?>
                            </button>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </section>
    </section>
    <section class="product-categories">
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
    </section>
    <section class="promo-banner">
        <div class="promo-container">
            <img src="assets/newarrival.jpg" alt="Summer Sale - Up to 70% OFF" class="promo-image">
            <div class="promo-badge">
                <span>Only@Sham Exclusive</span>
            </div>
            <div class="promo-discount">
                <span>UP TO 70% OFF</span>
            </div>
            <div class="promo-dates">
                <span>JUN 10 – JUL 24, 2025</span>
            </div>
            <a href="#product-grid" class="promo-button">Shop Now</a>
        </div>
    </section>
    <section id="flash-sale" class="flash-sale-section">
        <div id="flash-sale-container" class="container">
        </div>
    </section>
    <section id="about-us" class="about-us">
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
    </section>
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
    <section id="shop-reviews" class="shop-reviews">
        <h2>Customer Reviews</h2>
        <div class="reviews-container" id="reviews-container">
        </div>
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
    </section>
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
            <div class="social-media" id="Contact">
                <h3>Follow Us</h3>
                <div class="social-icons">
                    <a href="https://www.facebook.com/share/1FMLtsgqFB/?mibextid=qi2Omg" class="social-icon"><i class="fab fa-facebook-f"></i></a>
                    <a href="#" class="social-icon"><i class="fab fa-instagram"></i></a>
                    <a href="#" class="social-icon"><i class="fab fa-tiktok"></i></a>
                </div>
            </div>
        </div>
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
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'action=logout'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = data.redirect || 'login.php';
                }
            });
        }
        function setupUpdatesChecker(category) {
            const source = new EventSource('includes/sse.php');
            source.onmessage = function(event) {
                const data = JSON.parse(event.data);
                if (data.type === 'products_updated') {
                    const path = window.location.pathname;
                    if (path.includes('index.php') || path === '/') {
                        window.location.reload();
                    } else {
                        loadProducts(category);
                    }
                }
            };
            source.onerror = function() {
                console.error('SSE connection error');
            };
        }
    </script>
    <script src="js/cart.js"></script>
    <script src="js/script.js"></script>
    <script src="js/auth.js"></script>
</body>
</html>