<?php
header('Content-Type: application/json'); // Set response as JSON
header('Access-Control-Allow-Origin: *'); //  For cross-origin requests (development - refine in production!)
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

$request_method = $_SERVER['REQUEST_METHOD'];
$request_uri = $_SERVER['REQUEST_URI'];
$path_info = isset($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : '/';
$segments = explode('/', trim($path_info, '/'));
$endpoint = $segments[0];  // e.g., 'products', 'users', 'auth'

// Include necessary files
require __DIR__ . '/config/database.php'; // Database connection
// You might use autoloading for controllers/models (PSR-4)

// Basic routing - Expand as needed
switch ($endpoint) {
    case 'products':
        require __DIR__ . '/controllers/ProductController.php';
        $controller = new ProductController($conn, $request_method, $segments);
        $controller->processRequest();
        break;
    case 'users':
        require __DIR__ . '/controllers/UserController.php';
        $controller = new UserController($conn, $request_method, $segments);
        $controller->processRequest();
        break;
    case 'auth':
        require __DIR__ . '/controllers/AuthController.php';
        $controller = new AuthController($conn, $request_method, $segments);
        $controller->processRequest();
        break;
    case 'cart':
        require __DIR__ . '/controllers/CartController.php';
        $controller = new CartController($conn, $request_method, $segments);
        $controller->processRequest();
        break;
    case 'reservations':
        require __DIR__ . '/controllers/ReservationController.php';
        $controller = new ReservationController($conn, $request_method, $segments);
        $controller->processRequest();
        break;
    case 'feedback':
        require __DIR__ . '/controllers/FeedbackController.php';
        $controller = new FeedbackController($conn, $request_method, $segments);
        $controller->processRequest();
        break;
    case 'orders':
        require __DIR__ . '/controllers/OrderController.php';
        $controller = new OrderController($conn, $request_method, $segments);
        $controller->processRequest();
        break;
    case 'flashsales':
        require __DIR__ . '/controllers/FlashSaleController.php';
        $controller = new FlashSaleController($conn, $request_method, $segments);
        $controller->processRequest();
        break;
    case 'reviews':
        require __DIR__ . '/controllers/ReviewController.php';
        $controller = new ReviewController($conn, $request_method, $segments);
        $controller->processRequest();
        break;
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
        break;
}
?>