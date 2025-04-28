
    document.addEventListener('DOMContentLoaded', function() {
        // Backend API URL
        const API_URL = 'http://localhost:5000/api';
        
        // Check if user is logged in
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('authToken');
        
        if (!userId || !token) {
            // Redirect to login page if not logged in
            window.location.href = 'LOGIN.html';
            return;
        }
        
        // Auth header for API requests
        const authHeader = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        document.addEventListener("DOMContentLoaded", function() {
            const navLinks = document.querySelectorAll(".nav-links a");
    
            navLinks.forEach(link => {
                link.addEventListener("click", function() {
                    navLinks.forEach(link => link.classList.remove("active"));
                    this.classList.add("active");
                });
            });
        });
        // Current date variables
        let currentYear = new Date().getFullYear();
        let currentMonth = new Date().getMonth(); // 0-indexed
        
        // UI Elements
        const habitSelect = document.getElementById('habit-select');
        const calendarGrid = document.getElementById('calendar-grid');
        const currentDateElement = document.querySelector('.current-date');
        const prevMonthBtn = document.getElementById('prev-month');
        const nextMonthBtn = document.getElementById('next-month');
        const currentStreakElement = document.getElementById('current-streak');
        const longestStreakElement = document.getElementById('longest-streak');
        const completionRateElement = document.getElementById('completion-rate');
        
        // Load user's habits
        fetchUserProfile();
        loadHabits();
        
        // Event listeners for navigation
        prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            updateCalendar();
        });
        
        nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            updateCalendar();
        });
        
        // Listen for habit selection changes
        habitSelect.addEventListener('change', updateCalendar);
        
        // Fetch user profile information
        function fetchUserProfile() {
            fetch(`${API_URL}/user/profile`, {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Unauthorized');
                    }
                    throw new Error('Failed to fetch profile');
                }
                return response.json();
            })
            .then(data => {
                // Update profile information
                const userNameElement = document.querySelector('.user-name');
                if (userNameElement) {
                    userNameElement.textContent = data.profile.username;
                }

                // If profile photo URL is returned, update it
                const profilePhotoElement = document.querySelector('.profile-photo');
                if (data.profile.profile_photo && profilePhotoElement) {
                    profilePhotoElement.src = data.profile.profile_photo;
                }
            })
            .catch(error => {
                console.error('Error fetching profile:', error);
                if (error.message === 'Unauthorized') {
                    localStorage.removeItem('authToken');
                    window.location.href = 'LOGIN.html';
                }
            });
        }
        
        // Load user's habits
        function loadHabits() {
            fetch(`${API_URL}/habit/user`, {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Unauthorized');
                    }
                    throw new Error('Failed to fetch habits');
                }
                return response.json();
            })
            .then(data => {
                // Clear and populate habit select dropdown
                habitSelect.innerHTML = "";
                if (data.habits.length === 0) {
                    habitSelect.innerHTML = "<option value=''>No habits found</option>";
                } else {
                    data.habits.forEach(habit => {
                        const option = document.createElement('option');
                        option.value = habit._id;
                        option.textContent = habit.habit_name;
                        habitSelect.appendChild(option);
                    });
                    
                    // Load calendar for the first habit
                    updateCalendar();
                }
            })
            .catch(error => {
                console.error('Error loading habits:', error);
                if (error.message === 'Unauthorized') {
                    localStorage.removeItem('authToken');
                    window.location.href = 'LOGIN.html';
                }
            });
        }
        
        // Update calendar based on selected habit and month
        function updateCalendar() {
            const selectedHabitId = habitSelect.value;
            
            if (!selectedHabitId) {
                calendarGrid.innerHTML = "<p>Please select a habit</p>";
                return;
            }
            
            // Update month/year display
            const monthNames = ["January", "February", "March", "April", "May", "June",
                                "July", "August", "September", "October", "November", "December"];
            currentDateElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;
            
            // Fetch calendar data for the selected month and habit
            fetch(`${API_URL}/habit/month/${selectedHabitId}/${currentYear}/${currentMonth + 1}`, {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Unauthorized');
                    }
                    throw new Error('Failed to fetch calendar data');
                }
                return response.json();
            })
            .then(data => {
                renderCalendar(data.month_data);
                updateStreakStats(data.month_data);
            })
            .catch(error => {
                console.error('Error loading calendar data:', error);
                if (error.message === 'Unauthorized') {
                    localStorage.removeItem('authToken');
                    window.location.href = 'LOGIN.html';
                }
            });
        }
        
        // Render calendar with check-in data
        function renderCalendar(monthData) {
            calendarGrid.innerHTML = '';
            
            // Get first day of month and total days
            const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday
            const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
            
            // Fill in leading empty cells for days of week
            for (let i = 0; i < firstDay; i++) {
                const emptyDay = document.createElement('div');
                emptyDay.className = 'calendar-day inactive';
                calendarGrid.appendChild(emptyDay);
            }
            
            // Fill in days with data
            const today = new Date();
            const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;
            
            for (let day = 1; day <= totalDays; day++) {
                const dayElement = document.createElement('div');
                dayElement.className = 'calendar-day';
                
                // Check if this is today
                if (isCurrentMonth && today.getDate() === day) {
                    dayElement.classList.add('today');
                }
                
                // Find the corresponding data for this day
                const dayData = monthData.find(d => {
                    const dateParts = d.date.split('-');
                    return parseInt(dateParts[2]) === day;
                });
                
                // Mark as completed if check-in exists
                if (dayData && dayData.completed) {
                    dayElement.classList.add('completed');
                }
                
                // Add day number
                const dayNumber = document.createElement('div');
                dayNumber.className = 'day-number';
                dayNumber.textContent = day;
                dayElement.appendChild(dayNumber);
                
                // Add click handler for check-in capability
                // Only allow check-ins for current month up to today
                const clickableDate = new Date(currentYear, currentMonth, day);
                const isClickable = clickableDate <= today;
                
                if (isClickable) {
                    dayElement.addEventListener('click', () => handleDayClick(day));
                } else {
                    dayElement.classList.add('inactive');
                }
                
                calendarGrid.appendChild(dayElement);
            }
        }
        
        // Handle click on a calendar day
        function handleDayClick(day) {
            const selectedHabitId = habitSelect.value;
            if (!selectedHabitId) return;
            
            // Only allow check-ins for past dates up to today
            const selectedDate = new Date(currentYear, currentMonth, day);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate > today) {
                alert("You can't check in for future dates!");
                return;
            }
            
            // Check if already checked in (visual check)
            const dayElement = document.querySelector(`.calendar-day:nth-child(${day + getDayOffset()})`);
            if (dayElement.classList.contains('completed')) {
                alert("You've already checked in for this day!");
                return;
            }
            
            // Format date string similar to backend format (YYYY-MM-DD)
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            // Send check-in request to backend
            // Note: The backend route would need to support specific date check-ins
            fetch(`${API_URL}/habit/checkin/${selectedHabitId}?date=${dateStr}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.message || 'Failed to check in');
                    });
                }
                return response.json();
            })
            .then(data => {
                // Mark the day as completed
                dayElement.classList.add('completed');
                // Refresh calendar to update streak stats
                updateCalendar();
            })
            .catch(error => {
                console.error('Error checking in:', error);
                alert(error.message);
            });
        }
        
        // Helper function to get day offset in the grid
        function getDayOffset() {
            return new Date(currentYear, currentMonth, 1).getDay(); // Days to offset for first day of month
        }
        
        // Update streak statistics
        function updateStreakStats(monthData) {
            let currentStreak = 0;
            let longestStreak = 0;
            let tempStreak = 0;
            let completedDays = 0;
            
            // Count completed days
            monthData.forEach(day => {
                if (day.completed) {
                    completedDays++;
                }
            });
            
            // Calculate completion rate
            const totalDays = monthData.length;
            const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
            
            // Calculate current and longest streaks
            // Note: This is simplified for the current month view
            // For a full streak calculation, you would need data across multiple months
            
            // Sort by date
            const sortedData = [...monthData].sort((a, b) => {
                return new Date(a.date) - new Date(b.date);
            });
            
            // Calculate streaks
            for (let i = 0; i < sortedData.length; i++) {
                if (sortedData[i].completed) {
                    tempStreak++;
                    
                    // Check if this is part of the current streak (up to today)
                    const dayDate = new Date(sortedData[i].date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    if (dayDate <= today) {
                        const isYesterday = i > 0 ? 
                            isConsecutiveDays(sortedData[i-1].date, sortedData[i].date) : false;
                            
                        if (isYesterday || i === 0) {
                            currentStreak = tempStreak;
                        }
                    }
                } else {
                    // Reset temp streak on missed days
                    tempStreak = 0;
                }
                
                // Update longest streak
                longestStreak = Math.max(longestStreak, tempStreak);
            }
            
            // Update UI
            currentStreakElement.textContent = currentStreak;
            longestStreakElement.textContent = longestStreak;
            completionRateElement.textContent = `${completionRate}%`;
        }
        
        // Helper to check if dates are consecutive
        function isConsecutiveDays(date1, date2) {
            const d1 = new Date(date1);
            const d2 = new Date(date2);
            const diffTime = Math.abs(d2 - d1);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays === 1;
        }
        
        // Add logout functionality
        document.querySelector('.logout-btn').addEventListener('click', function() {
            localStorage.removeItem('userId');
            localStorage.removeItem('authToken');
            window.location.href = 'LOGIN.html';
        });
    });
    // export const streak = longestStreak;