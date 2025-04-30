<?php
session_start();

// Handle AJAX requests
if (isset($_GET['action'])) {
    header('Content-Type: application/json');
    
    switch ($_GET['action']) {
        case 'check_login':
            echo json_encode(['loggedIn' => isset($_SESSION['loggedInUser'])]);
            exit;
            
        case 'get_cart_count':
            $count = 0;
            if (isset($_SESSION['loggedInUser']) && isset($_SESSION['loggedInUser']['cart'])) {
                foreach ($_SESSION['loggedInUser']['cart'] as $item) {
                    if (!isset($item['status']) || $item['status'] !== 'picked') {
                        $count += $item['quantity'];
                    }
                }
            }
            echo json_encode(['count' => $count]);
            exit;
            
        case 'get_cart':
            if (!isset($_SESSION['loggedInUser'])) {
                echo json_encode(['loggedIn' => false]);
                exit;
            }
            
            $response = [
                'loggedIn' => true,
                'cartItems' => $_SESSION['loggedInUser']['cart'] ?? [],
                'pickedItems' => $_SESSION['loggedInUser']['pickedItems'] ?? []
            ];
            echo json_encode($response);
            exit;
            
        case 'clean_expired':
            $updated = false;
            if (isset($_SESSION['loggedInUser']) && isset($_SESSION['loggedInUser']['cart'])) {
                $now = new DateTime();
                foreach ($_SESSION['loggedInUser']['cart'] as $key => $item) {
                    if (isset($item['status']) && $item['status'] === 'reserved' && isset($item['reservedAt'])) {
                        $expiryDate = new DateTime($item['reservedAt']);
                        $expiryDate->modify('+3 days');
                        if ($expiryDate < $now) {
                            unset($_SESSION['loggedInUser']['cart'][$key]);
                            $updated = true;
                        }
                    }
                }
                if ($updated) {
                    $_SESSION['loggedInUser']['cart'] = array_values($_SESSION['loggedInUser']['cart']);
                }
            }
            echo json_encode(['updated' => $updated]);
            exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    header('Content-Type: application/json');
    
    if (!isset($_SESSION['loggedInUser'])) {
        echo json_encode(['success' => false, 'message' => 'Not logged in']);
        exit;
    }
    
    switch ($_POST['action']) {
        case 'cancel_item':
            $index = intval($_POST['index'] ?? -1);
            $isPicked = filter_var($_POST['is_picked'] ?? false, FILTER_VALIDATE_BOOLEAN);
            
            if ($index === -1) {
                echo json_encode(['success' => false, 'message' => 'Invalid index']);
                exit;
            }
            
            if ($isPicked) {
                // Handle deleting picked items
                if (isset($_SESSION['loggedInUser']['pickedItems']) && isset($_SESSION['loggedInUser']['pickedItems'][$index])) {
                    array_splice($_SESSION['loggedInUser']['pickedItems'], $index, 1);
                    echo json_encode(['success' => true]);
                    exit;
                }
            } else {
                // Handle canceling reservations
                if (isset($_SESSION['loggedInUser']['cart']) && isset($_SESSION['loggedInUser']['cart'][$index])) {
                    $item = $_SESSION['loggedInUser']['cart'][$index];
                    
                    // Update product stock if the item wasn't picked
                    if (!isset($item['status']) || $item['status'] !== 'picked') {
                        if (isset($_SESSION['products'])) {
                            foreach ($_SESSION['products'] as &$product) {
                                if ($product['id'] === $item['productId']) {
                                    $product['sizes'][$item['size']] += $item['quantity'];
                                    break;
                                }
                            }
                        }
                    }
                    
                    // Remove the item from cart
                    array_splice($_SESSION['loggedInUser']['cart'], $index, 1);
                    echo json_encode(['success' => true]);
                    exit;
                }
            }
            
            echo json_encode(['success' => false, 'message' => 'Item not found']);
            exit;
            
        case 'confirm_item':
            $index = intval($_POST['index'] ?? -1);
            
            if ($index === -1) {
                echo json_encode(['success' => false, 'message' => 'Invalid index']);
                exit;
            }
            
            if (isset($_SESSION['loggedInUser']['cart']) && isset($_SESSION['loggedInUser']['cart'][$index])) {
                $item = &$_SESSION['loggedInUser']['cart'][$index];
                
                if (isset($item['status']) && $item['status'] !== 'pending') {
                    echo json_encode(['success' => false, 'message' => 'Item already confirmed']);
                    exit;
                }
                
                $item['status'] = 'reserved';
                $item['reservedAt'] = date('c');
                
                echo json_encode([
                    'success' => true,
                    'itemName' => $item['name']
                ]);
                exit;
            }
            
            echo json_encode(['success' => false, 'message' => 'Item not found']);
            exit;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reservations | Only@Sham</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="cart.css">
</head>
<body>
    <nav class="navbar">
        <!-- Logo -->
        <div class="logo">
            <a href="index.php">Only@Sham</a>
        </div>

        <!-- Menu Links -->
        <ul class="nav-links">
            <li><a href="index.php#home">Home</a></li>
            <li><a href="index.php#shop">Shop</a></li>
            <li><a href="cart.php" class="active">Reservations</a></li>
            <li><a href="index.php#about-us">About Us</a></li>
            <li><a href="index.php#Contact">Contact</a></li>
        </ul>

        <!-- Icons -->
        <div class="nav-icons">
            <a href="profile.php" class="profile-icon"><i class="fas fa-user"></i></a>
            <div class="settings-icon" onclick="toggleSidebar()">
                <i class="fas fa-ellipsis-v"></i>
            </div>
        </div>

        <!-- Sidebar -->
        <div class="sidebar" id="sidebar">
            <a href="#" class="close-btn" onclick="toggleSidebar()">&times;</a>
            <a href="#" id="login-logout-link">Login</a>
            <a href="#" class="sidebar-link settings-link">Settings</a>
            <a href="#" class="sidebar-link help-link">Help</a>
        </div>
    </nav>

    <div class="cart-container">
        <h1>Your Reservations</h1>
        <div class="reservation-notice">
            <i class="fas fa-info-circle"></i>
            <p>You have <strong>3 days</strong> to pick up your reserved items. After 3 days, unclaimed reservations will be automatically canceled.</p>
        </div>
        
        <div class="cart-items" id="cart-items">
            <!-- Cart items will be loaded here by JavaScript -->
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Your reservation cart is empty</p>
                <a href="index.php#shop" class="btn">Continue Shopping</a>
            </div>
        </div>
        
        <div class="cart-summary">
            <div class="summary-card">
                <h3>Reservation Summary</h3>
                <div class="summary-row">
                    <span>Items:</span>
                    <span id="summary-items">0</span>
                </div>
                <div class="summary-row">
                    <span>Pending Items:</span>
                    <span id="summary-pending">0</span>
                </div>
                <div class="summary-row">
                    <span>Reserved Items:</span>
                    <span id="summary-reserved">0</span>
                </div>
                <div class="summary-row highlight">
                    <span>Total Value:</span>
                    <span id="summary-total">₱0.00</span>
                </div>
            </div>
        </div>
    </div>

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
            <div class="social-media">
                <h3>Follow Us</h3>
                <div class="social-icons">
                    <a href="#" class="social-icon"><i class="fab fa-facebook-f"></i></a>
                    <a href="#" class="social-icon"><i class="fab fa-instagram"></i></a>
                    <a href="#" class="social-icon"><i class="fab fa-tiktok"></i></a>
                </div>
            </div>
        </div>

        <!-- Footer Bottom -->
        <div class="footer-bottom">
            <p>&copy; 2023 Only@Sham. All rights reserved.</p>
        </div>
    </footer>

    <script src="script.js"></script>
    <script>
        // Cart Page Script - AJAX Version

        // Global utility function
        function updateCartCount() {
            const cartCountElements = document.querySelectorAll('#cart-count');
            
            fetch('cart.php?action=get_cart_count')
                .then(response => response.json())
                .then(data => {
                    cartCountElements.forEach(element => {
                        element.textContent = data.count || '0';
                    });
                })
                .catch(error => {
                    console.error('Error:', error);
                    cartCountElements.forEach(element => {
                        element.textContent = '0';
                    });
                });
        }

        function updateSummary(totalItems, pendingItems, reservedItems, totalAmount) {
            const summaryItems = document.getElementById('summary-items');
            const summaryPending = document.getElementById('summary-pending');
            const summaryReserved = document.getElementById('summary-reserved');
            const summaryTotal = document.getElementById('summary-total');

            summaryItems.textContent = totalItems;
            summaryPending.textContent = pendingItems;
            summaryReserved.textContent = reservedItems;
            summaryTotal.textContent = `₱${totalAmount.toFixed(2)}`;
        }

        function cancelCartItem(index, isPicked = false) {
            if (!confirm('Are you sure you want to delete this item?')) {
                return;
            }

            const formData = new FormData();
            formData.append('action', 'cancel_item');
            formData.append('index', index);
            formData.append('is_picked', isPicked);

            fetch('cart.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    loadCartItems();
                    updateCartCount();
                } else {
                    alert(data.message || 'Failed to cancel item');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while canceling the item');
            });
        }

        function confirmCartItem(index) {
            const formData = new FormData();
            formData.append('action', 'confirm_item');
            formData.append('index', index);

            fetch('cart.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(`Reservation confirmed for ${data.itemName}! You have 3 days to pick it up.`);
                    loadCartItems();
                    updateCartCount();
                } else {
                    alert(data.message || 'Failed to confirm reservation');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while confirming the reservation');
            });
        }

        function cleanExpiredReservations() {
            fetch('cart.php?action=clean_expired')
                .then(response => response.json())
                .then(data => {
                    if (data.updated) {
                        loadCartItems();
                    }
                })
                .catch(error => {
                    console.error('Error cleaning expired reservations:', error);
                });
        }

        function loadCartItems() {
            fetch('cart.php?action=get_cart')
                .then(response => response.json())
                .then(data => {
                    const cartItemsContainer = document.getElementById('cart-items');
                    
                    if (!data.loggedIn) {
                        window.location.href = 'login.php';
                        return;
                    }

                    if (data.cartItems.length === 0 && data.pickedItems.length === 0) {
                        cartItemsContainer.innerHTML = `
                            <div class="empty-cart">
                                <i class="fas fa-shopping-cart"></i>
                                <p>Your reservation cart is empty</p>
                                <a href="index.php#shop" class="btn">Continue Shopping</a>
                            </div>
                        `;
                        updateSummary(0, 0, 0, 0);
                        return;
                    }

                    let itemsHtml = '';
                    let totalItems = 0;
                    let pendingItems = 0;
                    let reservedItems = 0;
                    let totalAmount = 0;

                    // Current reservations
                    data.cartItems.forEach((item, index) => {
                        totalItems += item.quantity;
                        totalAmount += item.price * item.quantity;

                        let statusClass, statusText;
                        if (item.status === 'picked') {
                            statusClass = 'status-picked';
                            statusText = 'Picked Up';
                        } else if (item.status === 'reserved' || item.status === 'confirmed') {
                            statusClass = 'status-reserved';
                            statusText = 'Reserved';
                            reservedItems += item.quantity;
                            
                            const expiryDate = new Date(item.reservedAt);
                            expiryDate.setDate(expiryDate.getDate() + 3);
                            
                            const now = new Date();
                            const timeLeft = expiryDate - now;
                            const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
                            
                            if (daysLeft <= 0) {
                                statusClass = 'status-pending';
                                statusText = 'Expired';
                            }
                        } else {
                            statusClass = 'status-pending';
                            statusText = 'Pending';
                            pendingItems += item.quantity;
                        }

                        // Format expiry date with time
                        let expiryDisplay = '';
                        if (item.reservedAt && (item.status === 'reserved' || item.status === 'confirmed')) {
                            const expiryDate = new Date(item.reservedAt);
                            expiryDate.setDate(expiryDate.getDate() + 3);
                            expiryDisplay = expiryDate.toLocaleString('en-US', {
                                month: '2-digit',
                                day: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            });
                        }

                        itemsHtml += `
                            <div class="cart-item">
                                <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                                <div class="cart-item-details">
                                    <h3 class="cart-item-title">${item.name}</h3>
                                    <p class="cart-item-price">₱${item.price.toFixed(2)}</p>
                                    <p class="cart-item-size">Size: ${item.size}</p>
                                    <p class="cart-item-quantity">Quantity: ${item.quantity}</p>
                                    <span class="cart-item-status ${statusClass}">${statusText}</span>
                                    ${(item.status === 'reserved' || item.status === 'confirmed') ? 
                                        `<p class="cart-item-expiry">Pick up before: ${expiryDisplay}</p>` : ''}
                                </div>
                                ${item.status !== 'picked' ? `
                                <div class="cart-item-actions">
                                    ${item.status !== 'reserved' && item.status !== 'confirmed' ? 
                                        `<button class="btn-confirm" data-index="${index}">
                                            <i class="fas fa-check"></i> Confirm
                                        </button>` : ''}
                                    <button class="btn-cancel" data-index="${index}" data-picked="false">
                                        <i class="fas fa-times"></i> Cancel
                                    </button>
                                </div>` : ''}
                            </div>
                        `;
                    });

                    // Picked items (order history)
                    if (data.pickedItems.length > 0) {
                        itemsHtml += `<h3 class="order-history-title">Order History</h3>`;
                        
                        data.pickedItems.forEach((item, index) => {
                            totalItems += item.quantity;
                            totalAmount += item.price * item.quantity;

                            // Format picked date with time
                            const pickedDate = item.pickedAt ? new Date(item.pickedAt).toLocaleString('en-US', {
                                month: '2-digit',
                                day: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            }) : 'N/A';

                            itemsHtml += `
                                <div class="cart-item">
                                    <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                                    <div class="cart-item-details">
                                        <h3 class="cart-item-title">${item.name}</h3>
                                        <p class="cart-item-price">₱${item.price.toFixed(2)}</p>
                                        <p class="cart-item-size">Size: ${item.size}</p>
                                        <p class="cart-item-quantity">Quantity: ${item.quantity}</p>
                                        <span class="cart-item-status status-completed">Picked Up</span>
                                        <p class="cart-item-expiry">Picked on: ${pickedDate}</p>
                                    </div>
                                    <div class="cart-item-actions">
                                        <button class="btn-cancel" data-index="${index}" data-picked="true">
                                            <i class="fas fa-trash"></i> Delete
                                        </button>
                                    </div>
                                </div>
                            `;
                        });
                    }

                    cartItemsContainer.innerHTML = itemsHtml;
                    updateSummary(totalItems, pendingItems, reservedItems, totalAmount);

                    // Add event listeners to cancel buttons
                    document.querySelectorAll('.btn-cancel').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const isPicked = this.getAttribute('data-picked') === 'true';
                            cancelCartItem(parseInt(this.getAttribute('data-index')), isPicked);
                        });
                    });

                    // Add event listeners to confirm buttons
                    document.querySelectorAll('.btn-confirm').forEach(btn => {
                        btn.addEventListener('click', function() {
                            confirmCartItem(parseInt(this.getAttribute('data-index')));
                        });
                    });
                })
                .catch(error => {
                    console.error('Error loading cart items:', error);
                });
        }

        document.addEventListener('DOMContentLoaded', function() {
            // Check login status first
            fetch('cart.php?action=check_login')
                .then(response => response.json())
                .then(data => {
                    if (!data.loggedIn) {
                        window.location.href = 'login.php';
                        return;
                    }
                    
                    loadCartItems();
                    updateCartCount();
                    setupLoginLogout();

                    // Clean up expired reservations periodically
                    setInterval(cleanExpiredReservations, 60000);
                })
                .catch(error => {
                    console.error('Error checking login status:', error);
                    window.location.href = 'login.php';
                });
        });
    </script>
    <script src="script.js"></script>
</body>
</html>