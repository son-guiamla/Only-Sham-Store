// Global scope for stars and rating
let selectedRating = 0;
let stars = [];

document.addEventListener('DOMContentLoaded', function () {
    // Load reviews
    loadReviews();

    // Handle review submission
    stars = document.querySelectorAll('.stars i');

    stars.forEach(star => {
        star.addEventListener('click', function () {
            selectedRating = parseInt(this.getAttribute('data-rating'));
            stars.forEach((s, index) => {
                if (index < selectedRating) {
                    s.classList.remove('far');
                    s.classList.add('fas');
                } else {
                    s.classList.remove('fas');
                    s.classList.add('far');
                }
            });
            document.querySelector('.rating-text').textContent = `${selectedRating}/5`;
        });
    });

    document.getElementById('submit-review').addEventListener('click', submitReview);
});

function loadReviews() {
    const reviews = JSON.parse(localStorage.getItem('shopReviews')) || [];
    const container = document.getElementById('reviews-container');
    container.innerHTML = '';

    if (reviews.length === 0) {
        container.innerHTML = '<p class="empty-message">No reviews yet. Be the first to review!</p>';
        return;
    }

    reviews.forEach(review => {
        const reviewElement = document.createElement('div');
        reviewElement.className = 'review-item';
        
        // Get user data including profile picture
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.username === review.username);
        const profilePic = user?.profilePicture || review.profilePicture || 'assets/default-profile.png';
        
        reviewElement.innerHTML = `
            <div class="review-header">
                <img src="${profilePic}" alt="${review.username}" class="reviewer-avatar">
                <div>
                    <div class="reviewer-name">${review.username}</div>
                    <div class="review-date">${new Date(review.date).toLocaleDateString()}</div>
                </div>
            </div>
            <div class="review-rating">
                ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
            </div>
            <div class="review-text">${review.comment}</div>
        `;
        container.appendChild(reviewElement);
    });
}

function submitReview() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!loggedInUser) {
        alert('Please login to submit a review');
        return;
    }

    const comment = document.getElementById('review-comment').value.trim();
    const rating = selectedRating;

    if (rating === 0) {
        alert('Please select a rating');
        return;
    }

    if (comment === '') {
        alert('Please enter your review comment');
        return;
    }

    const reviews = JSON.parse(localStorage.getItem('shopReviews')) || [];

    // Get user's profile picture from both loggedInUser and users array
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.username === loggedInUser.username);
    const profilePic = user?.profilePicture || loggedInUser.profilePicture || 'assets/default-profile.png';

    reviews.push({
        username: loggedInUser.username,
        profilePicture: profilePic,
        rating,
        comment,
        date: new Date().toISOString()
    });

    localStorage.setItem('shopReviews', JSON.stringify(reviews));

    // Reset form
    document.getElementById('review-comment').value = '';
    stars.forEach(star => {
        star.classList.remove('fas');
        star.classList.add('far');
    });
    document.querySelector('.rating-text').textContent = '0/5';
    selectedRating = 0;

    // Reload reviews
    loadReviews();
    alert('Thank you for your review!');
}