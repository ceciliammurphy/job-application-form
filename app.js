// Job Application Tracker App
let applications = JSON.parse(localStorage.getItem('applications')) || [];

// DOM Elements
const form = document.getElementById('applicationForm');
const applicationsList = document.getElementById('applicationsList');
const filterButtons = document.querySelectorAll('.filter-btn');
const sortSelect = document.getElementById('sortSelect');
let currentFilter = 'all';
let currentSort = 'newest';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    updateStats();
    renderApplications();
    setTodayDate();
    
    // Add sort event listener
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderApplications();
    });
});

// Set today's date as default
function setTodayDate() {
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

// Form submission
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const application = {
        id: Date.now(),
        company: document.getElementById('company').value.trim(),
        position: document.getElementById('position').value.trim(),
        status: document.getElementById('status').value,
        date: document.getElementById('date').value,
        url: document.getElementById('url').value.trim(),
        notes: document.getElementById('notes').value.trim(),
        createdAt: new Date().toISOString()
    };
    
    applications.unshift(application);
    saveToLocalStorage();
    
    // Reset form
    form.reset();
    setTodayDate();
    
    // Update UI
    updateStats();
    renderApplications();
    
    // Show success animation
    showNotification('Application added successfully! 🎉');
});

// Filter buttons
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderApplications();
    });
});

// Render applications
function renderApplications() {
    // Filter applications
    let filteredApps = currentFilter === 'all' 
        ? [...applications] 
        : applications.filter(app => app.status === currentFilter);
    
    // Sort applications
    filteredApps.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        if (currentSort === 'newest') {
            return dateB - dateA; // Newest first
        } else {
            return dateA - dateB; // Oldest first
        }
    });
    
    if (filteredApps.length === 0) {
        applicationsList.innerHTML = `
            <div class="empty-state">
                <p>${currentFilter === 'all' ? 'No applications yet. Add your first one above! 🚀' : `No ${currentFilter} applications yet.`}</p>
            </div>
        `;
        return;
    }
    
    applicationsList.innerHTML = filteredApps.map(app => `
        <div class="application-card">
            <div class="application-header">
                <div class="application-info">
                    <h3>${app.company}</h3>
                    <p class="position">${app.position}</p>
                </div>
                <div class="application-actions">
                    <span class="status-badge status-${app.status}">${app.status}</span>
                    <button class="btn-delete" onclick="deleteApplication(${app.id})">Delete</button>
                </div>
            </div>
            <div class="application-details">
                <span class="detail-label">Date Applied:</span>
                <span class="detail-value">${formatDate(app.date)}</span>
                ${app.url ? `
                    <span class="detail-label">Website:</span>
                    <span class="detail-value">
                        <a href="${app.url}" target="_blank" rel="noopener noreferrer" class="company-link">
                            ${app.url} <span class="link-icon">↗</span>
                        </a>
                    </span>
                ` : ''}
                ${app.notes ? `
                    <span class="detail-label">Notes:</span>
                    <span class="detail-value">${app.notes}</span>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Delete application
function deleteApplication(id) {
    if (confirm('Are you sure you want to delete this application?')) {
        applications = applications.filter(app => app.id !== id);
        saveToLocalStorage();
        updateStats();
        renderApplications();
        showNotification('Application deleted');
    }
}

// Update statistics
function updateStats() {
    document.getElementById('totalApps').textContent = applications.length;
    document.getElementById('interviewCount').textContent = 
        applications.filter(app => app.status === 'Interview' || app.status === 'Offer').length;
    document.getElementById('offerCount').textContent = 
        applications.filter(app => app.status === 'Offer').length;
}

// Save to localStorage
function saveToLocalStorage() {
    localStorage.setItem('applications', JSON.stringify(applications));
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Show notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4f46e5;
        color: white;
        padding: 14px 22px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
        z-index: 1000;
        font-size: 0.9rem;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}