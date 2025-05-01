// dashboard.js - Script to connect dashboard with backend API
const API_URL = 'http://localhost:5000/api';
// import { streak } from "./habittrack";

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    // const token = localStorage.getItem('token');
    const token = localStorage.getItem('authToken');
    console.log(token);
    if (!token) {
        // Redirect to login page if not logged in
        window.location.href = 'login.html';
        return;
    }

    // Get user profile and habits
    fetchUserProfile();
    fetchUserHabits();
    // fetchCommunityUpdates();
    // fetchLeaderboard();

    // Setup logout functionality
    setupLogout();
    
    // Setup habit check-in functionality
    setupHabitCheckIn();
});

document.addEventListener("DOMContentLoaded", function() {
    const navLinks = document.querySelectorAll(".nav-links a");

    navLinks.forEach(link => {
        link.addEventListener("click", function() {
            navLinks.forEach(link => link.classList.remove("active"));
            this.classList.add("active");
        });
    });
});
// Fetch user profile information
function fetchUserProfile() {
    fetch(`${API_URL}/user/profile`, {
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('authToken')
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch profile');
        }
        return response.json();
    })
    .then(data => {
        // Update profile information
        document.querySelector('.user-name').textContent = data.profile.username;
        // If profile photo URL is returned, update it
        if (data.profile_photo) {
            document.querySelector('.profile-photo').src = data.profile.profile_photo;
        }
        
        // Update welcome message
        document.querySelector('h1').textContent = `Welcome back, ${data.profile.username}!`;
    })
    .catch(error => {
        console.error('Error fetching profile:', error);
        // Handle authentication errors (e.g., expired token)
        if (error.message.includes('401')) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        }
    });
}

// Fetch user's habits
function fetchUserHabits() {
    fetch(`${API_URL}/habits/user`, {
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('authToken')
        }
    })
    .then(response => response.json())
    .then(data => {
        const habitList = document.querySelector('.habit-list');
        habitList.innerHTML = ''; // Clear existing habits
        
        // Calculate total completed days for progress bar
        let completedDays = 0;
        let totalGoal = 7; // Weekly goal is 7 days
        
        if (data.habits && data.habits.length > 0) {
            // Add each habit to the list
            data.habits.forEach(habit => {
                // Create habit item
                const habitItem = document.createElement('li');
                habitItem.className = 'habit-item';
                habitItem.dataset.habitId = habit._id;
                
                // Make it look clickable with cursor style
                habitItem.style.cursor = 'pointer';
                
                // Calculate streak
                const streak = calculateStreak(habit.check_ins);
                
                // Add to completed days count for progress if has a streak
                // This assumes each streak represents a completed habit for the week
                if (streak > 0) {
                    completedDays++;
                }
                
                // Create habit name and streak elements
                habitItem.innerHTML = `
                    <span class="habit-name">${habit.habit_name}</span>
                    <span class="streak">Streak: ${streak} days</span>
                `;
                
                // Add click event to navigate to calendar with habit ID
                habitItem.addEventListener('click', function() {
                    // Store the selected habit ID in localStorage
                    localStorage.setItem('selectedHabitId', habit._id);
                    // Navigate to the calendar page
                    window.location.href = 'habittrack.html';
                });
                
                habitList.appendChild(habitItem);
            });
        } else {
            // No habits found
            const noHabitsMessage = document.createElement('li');
            noHabitsMessage.className = 'habit-item';
            noHabitsMessage.textContent = 'No habits found. Add a new habit to get started!';
            habitList.appendChild(noHabitsMessage);
        }
        
        console.log('Completed days count:', completedDays);
        
        // Update progress bar with completed days
        updateProgressBar(completedDays, totalGoal);
    })
    .catch(error => {
        console.error('Error fetching habits:', error);
        const habitList = document.querySelector('.habit-list');
        habitList.innerHTML = '<li class="habit-item">Error loading habits. Please try again.</li>';
    });
}

// Calculate streak from check-ins array
function calculateStreak(checkIns) {
    if (!checkIns || checkIns.length === 0) return 0;
    
    // Convert check-ins to Date objects for comparison
    const dates = checkIns.map(date => new Date(date));
    dates.sort((a, b) => a - b); // Sort dates chronologically
    
    // Get today and yesterday as Date objects
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Format for comparison
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Check if last check-in was today or yesterday
    const lastCheckIn = new Date(dates[dates.length - 1]);
    const lastCheckInStr = lastCheckIn.toISOString().split('T')[0];
    
    if (lastCheckInStr !== todayStr && lastCheckInStr !== yesterdayStr) {
        return 0; // Streak broken if not checked in today or yesterday
    }
    
    // Count consecutive days
    let streak = 1;
    let currentDate = new Date(dates[dates.length - 1]);
    
    for (let i = dates.length - 2; i >= 0; i--) {
        const prevDate = new Date(dates[i]);
        
        // Set times to midnight for proper day comparison
        currentDate.setHours(0, 0, 0, 0);
        prevDate.setHours(0, 0, 0, 0);
        
        // Calculate difference in days
        const diffTime = Math.abs(currentDate - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            streak++;
            currentDate = prevDate;
        } else {
            break; // Streak broken
        }
    }
    
    return streak;
}
// Update progress bar with completed/total days
function updateProgressBar(completed, total) {
    const progressPercentage = Math.min((completed / total) * 100, 100); // Cap at 100%
    const progressBar = document.querySelector('.progress');
    
    if (progressBar) {
        progressBar.style.width = `${progressPercentage}%`;
        
        // Change color based on progress
        if (progressPercentage < 30) {
            progressBar.style.backgroundColor = '#FF6B6B'; // Red for low progress
        } else if (progressPercentage < 70) {
            progressBar.style.backgroundColor = '#FFD166'; // Yellow for medium progress
        } else {
            progressBar.style.backgroundColor = '#06D6A0'; // Green for good progress
        }
        
        // Log the progress to verify it's working
        console.log(`Progress updated: ${completed}/${total} days (${progressPercentage}%)`);
    } else {
        console.error('Progress bar element not found');
    }
    
    // Update text
    const progressText = document.querySelector('.dashboard-card p');
    if (progressText) {
        progressText.textContent = `Weekly Goal: ${completed}/${total} days`;
    } else {
        console.error('Progress text element not found');
    }
}
// Fetch community updates
function fetchCommunityUpdates() {
    fetch(`${API_URL}/community/updates`, {
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('authToken')
        }
    })
    .then(response => response.json())
    .then(data => {
        const communityList = document.querySelector('.community-list');
        communityList.innerHTML = ''; // Clear existing updates
        
        // Add each community update
        data.updates.forEach(update => {
            const listItem = document.createElement('li');
            listItem.className = 'community-item';
            
            const buttonClass = update.following ? 'unfollow-btn' : 'follow-btn';
            const buttonText = update.following ? 'Unfollow' : 'Follow';
            
            listItem.innerHTML = `
                <img src="${update.profile_photo || 'default-avatar.png'}" alt="${update.username}" class="user-avatar">
                <div class="user-info">
                    <strong>${update.username}</strong>
                    <p>${update.activity}</p>
                </div>
                <button class="${buttonClass}" data-user-id="${update.user_id}">${buttonText}</button>
            `;
            
            communityList.appendChild(listItem);
        });
        
        // Set up follow/unfollow buttons
        setupFollowButtons();
    })
    .catch(error => {
        console.error('Error fetching community updates:', error);
    });
}

// Fetch leaderboard data
function fetchLeaderboard() {
    fetch(`${API_URL}/leaderboard`, {
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('authToken'),
        }
    })
    .then(response => response.json())
    .then(data => {
        const leaderboardList = document.querySelector('.leaderboard-list');
        leaderboardList.innerHTML = ''; // Clear existing entries
        
        // Add each leaderboard entry
        data.leaders.forEach((leader, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'leaderboard-item';
            
            // Highlight current user
            const isCurrentUser = leader.is_current_user ? 'You' : leader.username;
            
            listItem.innerHTML = `
                <span class="rank">${index + 1}</span>
                <img src="${leader.profile_photo || 'default-avatar.png'}" alt="${leader.username}" class="user-avatar">
                <div class="user-info">
                    <strong>${isCurrentUser}</strong>
                    <p>Streak: ${leader.streak} days</p>
                </div>
            `;
            
            leaderboardList.appendChild(listItem);
        });
    })
    .catch(error => {
        console.error('Error fetching leaderboard:', error);
    });
}

// Set up follow/unfollow button functionality
function setupFollowButtons() {
    const followButtons = document.querySelectorAll('.follow-btn, .unfollow-btn');
    followButtons.forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.dataset.userId;
            const action = this.classList.contains('follow-btn') ? 'follow' : 'unfollow';
            
            fetch(`${API_URL}/community/${action}/${userId}`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('authToken'),
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                // Toggle button class and text
                if (action === 'follow') {
                    this.textContent = 'Unfollow';
                    this.classList.remove('follow-btn');
                    this.classList.add('unfollow-btn');
                } else {
                    this.textContent = 'Follow';
                    this.classList.remove('unfollow-btn');
                    this.classList.add('follow-btn');
                }
            })
            .catch(error => {
                console.error(`Error ${action}ing user:`, error);
            });
        });
    });
}

// Set up habit check-in functionality
function setupHabitCheckIn() {
    const habitItems = document.querySelectorAll('.habit-item');
    habitItems.forEach(item => {
        item.addEventListener('click', function() {
            const habitId = this.dataset.habitId;
            
            fetch(`${API_URL}/habits/checkin/${habitId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('authToken'),
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 400) {
                        // Already checked in today
                        return response.json().then(data => {
                            throw new Error(data.message);
                        });
                    }
                    throw new Error('Failed to check in');
                }
                return response.json();
            })
            .then(data => {
                // Update UI to reflect successful check-in
                fetchUserHabits(); // Refresh habits display
                
                // Show success notification
                showNotification('Habit checked in successfully!', 'success');
            })
            .catch(error => {
                console.error('Error checking in habit:', error);
                showNotification(error.message || 'Failed to check in habit', 'error');
            });
        });
    });
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
}

// Handle logout
function setupLogout() {
    const logoutButton = document.querySelector('#logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userId');
            window.location.href = 'login.html';
        });
    }
}