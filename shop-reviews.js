import { REVIEWS_ENDPOINT } from './config.js';
import { getAuthToken, isLoggedIn } from './auth.js';

document.addEventListener('DOMContentLoaded', async function() {
    await loadReviews();
    setupRatingStars();
});

let selectedRating = 0;
let stars = [];

function setupRatingStars() {
    stars = Array.from(document.querySelectorAll('.star'));
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            selectedRating = index + 1;
            updateStarsDisplay();
            document.querySelector('.rating-text').textContent = `${selectedRating}/5`;
        });
    });
}

function updateStarsDisplay() {
    stars.forEach((star, index) => {
        star.classList.toggle('fas', index < selectedRating);
        star.classList.toggle('far', index >= selectedRating);
    });
}

async function loadReviews() {
    const container = document.getElementById('reviews-container');
    container.innerHTML = '<div class="loading">Loading reviews...</div>';
    
    try {
        const response = await fetch(REVIEWS_ENDPOINT);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        const reviews = await response.json();
        
        if (!reviews.length) {
            container.innerHTML = '<div class="empty">No reviews yet. Be the first!</div>';
            return;
        }
        
        container.innerHTML = reviews.map(review => `
            <div class="review" data-id="${review.id}">
                <div class="review-header">
                    <img src="${review.user.profilePicture || 'assets/default-profile.png'}" 
                         alt="${review.user.username}" 
                         class="review-avatar">
                    <div>
                        <h4>${review.user.username}</h4>
                        <div class="review-meta">
                            <span class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
                            <span class="review-date">${new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <div class="review-content">
                    <p>${review.comment}</p>
                </div>
                ${review.canEdit ? `
                    <div class="review-actions">
                        <button class="btn edit-review" onclick="editReview('${review.id}')">Edit</button>
                        <button class="btn delete-review" onclick="deleteReview('${review.id}')">Delete</button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading reviews:', error);
        container.innerHTML = `<div class="error">${error.message}</div>`;
    }
}

window.submitReview = async function() {
    if (!isLoggedIn()) {
        alert('Please login to submit a review');
        window.location.href = 'login.html';
        return;
    }
    
    const comment = document.getElementById('review-comment').value.trim();
    
    if (!selectedRating) {
        alert('Please select a rating');
        return;
    }
    
    if (!comment) {
        alert('Please enter your review');
        return;
    }
    
    try {
        const response = await fetch(REVIEWS_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ rating: selectedRating, comment })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        // Reset form
        document.getElementById('review-comment').value = '';
        selectedRating = 0;
        updateStarsDisplay();
        document.querySelector('.rating-text').textContent = '0/5';
        
        // Reload reviews
        await loadReviews();
        
        // Show success
        showNotification('Review submitted successfully!', 'success');
    } catch (error) {
        console.error('Error submitting review:', error);
        showNotification(error.message, 'error');
    }
};

window.editReview = async function(reviewId) {
    try {
        // Get review details
        const response = await fetch(`${REVIEWS_ENDPOINT}${reviewId}`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        const review = await response.json();
        
        // Populate edit form
        selectedRating = review.rating;
        updateStarsDisplay();
        document.querySelector('.rating-text').textContent = `${selectedRating}/5`;
        document.getElementById('review-comment').value = review.comment;
        
        // Change submit button to update
        const submitBtn = document.getElementById('submit-review');
        submitBtn.textContent = 'Update Review';
        submitBtn.onclick = async function() {
            await updateReview(reviewId);
        };
        
        // Scroll to form
        document.getElementById('review-form').scrollIntoView();
    } catch (error) {
        console.error('Error editing review:', error);
        showNotification(error.message, 'error');
    }
};

async function updateReview(reviewId) {
    const comment = document.getElementById('review-comment').value.trim();
    
    if (!selectedRating || !comment) {
        alert('Please provide both rating and comment');
        return;
    }
    
    try {
        const response = await fetch(`${REVIEWS_ENDPOINT}${reviewId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ rating: selectedRating, comment })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        // Reset form
        document.getElementById('review-comment').value = '';
        selectedRating = 0;
        updateStarsDisplay();
        document.querySelector('.rating-text').textContent = '0/5';
        
        // Reset submit button
        const submitBtn = document.getElementById('submit-review');
        submitBtn.textContent = 'Submit Review';
        submitBtn.onclick = submitReview;
        
        // Reload reviews
        await loadReviews();
        
        showNotification('Review updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating review:', error);
        showNotification(error.message, 'error');
    }
}

window.deleteReview = async function(reviewId) {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    try {
        const response = await fetch(`${REVIEWS_ENDPOINT}${reviewId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        await loadReviews();
        showNotification('Review deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting review:', error);
        showNotification(error.message, 'error');
    }
};

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}