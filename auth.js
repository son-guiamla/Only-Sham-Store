import { 
    API_BASE_URL,
    AUTH_ENDPOINT, 
    USERS_ENDPOINT,
    CART_ENDPOINT 
} from './config.js';

// Token management
function storeAuthData({ token, user }) {
    sessionStorage.setItem('authToken', token); // Changed from localStorage
    sessionStorage.setItem('loggedInUser', JSON.stringify(user));
}

function getAuthToken() {
    return sessionStorage.getItem('authToken'); // Updated from localStorage
}

function clearAuthData() {
    sessionStorage.removeItem('authToken'); // Updated from localStorage
    sessionStorage.removeItem('loggedInUser'); // Updated from localStorage
}

function isLoggedIn() {
    return !!getAuthToken();
}

async function refreshToken() {
    try {
        const response = await fetch(`${AUTH_ENDPOINT}refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Token refresh failed');
        }

        const { token } = await response.json();
        sessionStorage.setItem('authToken', token); // Updated from localStorage
        return true;
    } catch (error) {
        console.error('Token refresh failed:', error);
        clearAuthData();
        return false;
    }
}

async function getCSRFToken() {
    const response = await fetch(`${AUTH_ENDPOINT}csrf-token`, {
        credentials: 'include'
    });
    const { token } = await response.json();
    return token;
}

// Enhanced fetch with token refresh and CSRF token
async function authFetch(url, options = {}) {
    options.headers = options.headers || {};
    options.headers['Authorization'] = `Bearer ${getAuthToken()}`;
    
    // Add CSRF token for non-GET requests
    if (options.method && options.method !== 'GET') {
        options.headers['X-CSRF-Token'] = await getCSRFToken();
    }

    let response = await fetch(url, options);
    
    // If token expired, try to refresh and retry
    if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
            options.headers['Authorization'] = `Bearer ${getAuthToken()}`;
            response = await fetch(url, options);
        } else {
            clearAuthData();
            window.location.href = 'login.html?session=expired';
            return;
        }
    }
    
    return response;
}

// User authentication
async function registerUser(fullname, username, email, phone, password, gender = '') {
    // Add validation
    if (!fullname || !username || !email || !password) {
        return { success: false, error: 'All required fields must be filled' };
    }
    
    if (password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' };
    }
    
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        return { success: false, error: 'Invalid email format' };
    }

    try {
        const response = await fetch(`${AUTH_ENDPOINT}register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fullname,
                username,
                email,
                phone,
                password,
                gender
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        storeAuthData(data);
        return { success: true, data };
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: error.message };
    }
}

async function loginUser(username, password) {
    try {
        const response = await fetch(`${AUTH_ENDPOINT}login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        storeAuthData(data);
        return { success: true, data };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

async function checkUserBanStatus() {
    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser')); // Updated from localStorage
    const token = getAuthToken();
    if (!loggedInUser || !token) return false;

    try {
        const response = await authFetch(`${USERS_ENDPOINT}${loggedInUser.username}/status`);
        
        if (!response.ok) {
            throw new Error('Failed to check user status');
        }

        const { banned } = await response.json();
        if (banned) {
            clearAuthData();
            window.location.href = 'login.html?banned=true';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error checking ban status:', error);
        return true;
    }
}

function logoutUser() {
    clearAuthData();
    window.location.href = 'login.html';
}

// UI Functions
function setupLoginLogout() {
    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser')); // Updated from localStorage
    const loginLink = document.getElementById('login-logout-link');
    
    if (!loginLink) return;
    
    if (loggedInUser) {
        loginLink.textContent = 'Logout';
        loginLink.href = '#';
        loginLink.onclick = function(e) {
            e.preventDefault();
            logoutUser();
        };
    } else {
        loginLink.textContent = 'Login';
        loginLink.href = 'login.html';
        loginLink.onclick = null;
    }
}

function updateCartCount() {
    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser')); // Updated from localStorage
    const cartCountElements = document.querySelectorAll('.cart-count');
    
    if (!loggedInUser) {
        cartCountElements.forEach(el => el.textContent = '0');
        return;
    }

    authFetch(`${CART_ENDPOINT}count`)
    .then(response => {
        if (!response.ok) throw new Error('Failed to get cart count');
        return response.json();
    })
    .then(({ count }) => {
        cartCountElements.forEach(el => el.textContent = count || '0');
    })
    .catch(error => {
        console.error('Error updating cart count:', error);
        cartCountElements.forEach(el => el.textContent = '0');
    });
}

export {
    storeAuthData,
    getAuthToken,
    clearAuthData,
    isLoggedIn,
    refreshToken,
    authFetch,
    registerUser,
    loginUser,
    checkUserBanStatus,
    logoutUser,
    setupLoginLogout,
    updateCartCount
};