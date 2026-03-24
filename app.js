// Job Application Tracker App
let applications = JSON.parse(localStorage.getItem('applications')) || [];
let selectedApplications = new Set();

// DOM Elements
const form = document.getElementById('applicationForm');
const applicationsList = document.getElementById('applicationsList');
const filterButtons = document.querySelectorAll('.filter-btn');
const sortSelect = document.getElementById('sortSelect');
const locationFilter = document.getElementById('locationFilter');
const bulkActionsDiv = document.getElementById('bulkActions');
const selectedCountSpan = document.getElementById('selectedCount');
const bulkStatusSelect = document.getElementById('bulkStatusSelect');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');
let currentFilter = 'Applied';
let currentSort = 'newest';
let currentLocationFilter = 'all';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize lastUpdated for existing applications
    initializeLastUpdated();
    
    // Normalize existing locations
    normalizeExistingLocations();
    
    // Auto-ghost old applications (applied > 30 days)
    autoGhostOldApplications();
    
    updateStats();
    updateLocationFilter();
    renderApplications();
    setTodayDate();
    
    // Add sort event listener
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderApplications();
    });

    // Add location filter event listener
    locationFilter.addEventListener('change', (e) => {
        currentLocationFilter = e.target.value;
        renderApplications();
    });
    
    // Bulk action listeners
    bulkStatusSelect.addEventListener('change', (e) => {
        if (e.target.value && selectedApplications.size > 0) {
            bulkUpdateStatus(e.target.value);
            e.target.value = ''; // Reset dropdown
        }
    });
    
    bulkDeleteBtn.addEventListener('click', bulkDelete);
    clearSelectionBtn.addEventListener('click', clearSelection);
});

// Initialize lastUpdated for existing applications
function initializeLastUpdated() {
    let needsUpdate = false;
    applications.forEach(app => {
        if (!app.lastUpdated) {
            // Use createdAt if available, otherwise use date
            app.lastUpdated = app.createdAt || new Date(app.date).toISOString();
            needsUpdate = true;
        }
    });
    if (needsUpdate) {
        saveToLocalStorage();
    }
}

// Normalize existing locations in saved applications
function normalizeExistingLocations() {
    let needsUpdate = false;
    applications.forEach(app => {
        if (app.location) {
            const normalized = capitalizeLocation(app.location);
            if (app.location !== normalized) {
                app.location = normalized;
                needsUpdate = true;
            }
        }
    });
    if (needsUpdate) {
        saveToLocalStorage();
    }
}

// Auto-ghost applications that have been in 'Applied' status for over 30 days
function autoGhostOldApplications() {
    const now = new Date();
    let changed = false;
    applications.forEach(app => {
        if (app.status === 'Applied' && app.date) {
            // Parse stored date assuming YYYY-MM-DD or ISO-like
            const appliedDate = new Date(app.date);
            // If parsing failed or produced Invalid Date, try splitting (legacy handling)
            if (isNaN(appliedDate)) {
                const parts = (app.date || '').split('-');
                if (parts.length === 3) {
                    const [y, m, d] = parts.map(Number);
                    // months are 0-indexed
                    const localDate = new Date(y, m - 1, d);
                    if (!isNaN(localDate)) {
                        appliedDate.setTime(localDate.getTime());
                    }
                }
            }

            if (!isNaN(appliedDate)) {
                const daysElapsed = (now - appliedDate) / (1000 * 60 * 60 * 24);
                if (daysElapsed > 30) {
                    app.status = 'Ghosted';
                    app.lastUpdated = new Date().toISOString();
                    changed = true;
                }
            }
        }
    });
    if (changed) {
        saveToLocalStorage();
        updateStats();
        showNotification('Moved long-applied applications to Ghosted');
    }
}

// Set today's date as default
function setTodayDate() {
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

// Form submission
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const salaryValue = document.getElementById('salary').value;
    const locationValue = document.getElementById('location').value.trim();
    
    const application = {
        id: Date.now(),
        company: document.getElementById('company').value.trim(),
        position: document.getElementById('position').value.trim(),
        location: capitalizeLocation(locationValue),
        status: document.getElementById('status').value,
        date: document.getElementById('date').value,
        salary: salaryValue ? parseFloat(salaryValue) : null,
        coverLetter: document.getElementById('coverLetter').checked,
        url: document.getElementById('url').value.trim(),
        notes: document.getElementById('notes').value.trim(),
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };
    
    applications.unshift(application);
    saveToLocalStorage();
    
    // Reset form
    form.reset();
    setTodayDate();
    
    // Update UI
    updateStats();
    updateLocationFilter();
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
    // Ensure any old 'Applied' apps are marked as Ghosted before rendering
    autoGhostOldApplications();
    // Filter applications by status
    let filteredApps = currentFilter === 'all' 
        ? [...applications] 
        : applications.filter(app => app.status === currentFilter);
    
    // Filter applications by location
    if (currentLocationFilter !== 'all') {
        filteredApps = filteredApps.filter(app => app.location === currentLocationFilter);
    }
    
    // Sort applications
    filteredApps.sort((a, b) => {
        if (currentSort === 'newest') {
            return new Date(b.date) - new Date(a.date); // Newest first
        } else if (currentSort === 'oldest') {
            return new Date(a.date) - new Date(b.date); // Oldest first
        } else if (currentSort === 'most-active') {
            // Sort by most recently updated (most active)
            const dateA = new Date(a.lastUpdated || a.createdAt || a.date);
            const dateB = new Date(b.lastUpdated || b.createdAt || b.date);
            return dateB - dateA;
        } else if (currentSort === 'least-active') {
            // Sort by least recently updated (least active)
            const dateA = new Date(a.lastUpdated || a.createdAt || a.date);
            const dateB = new Date(b.lastUpdated || b.createdAt || b.date);
            return dateA - dateB;
        } else if (currentSort === 'company-az') {
            // Sort alphabetically by company name A-Z
            return a.company.localeCompare(b.company);
        } else if (currentSort === 'company-za') {
            // Sort alphabetically by company name Z-A
            return b.company.localeCompare(a.company);
        } else if (currentSort === 'position-az') {
            // Sort alphabetically by position A-Z
            return a.position.localeCompare(b.position);
        } else if (currentSort === 'position-za') {
            // Sort alphabetically by position Z-A
            return b.position.localeCompare(a.position);
        } else if (currentSort === 'salary-high') {
            // Sort by salary high to low (handle null values)
            const salaryA = a.salary || 0;
            const salaryB = b.salary || 0;
            return salaryB - salaryA;
        } else if (currentSort === 'salary-low') {
            // Sort by salary low to high (handle null values)
            const salaryA = a.salary || 0;
            const salaryB = b.salary || 0;
            return salaryA - salaryB;
        }
        return 0;
    });
    
    if (filteredApps.length === 0) {
        applicationsList.innerHTML = `
            <div class="empty-state">
                <p>${currentFilter === 'all' ? 'No applications yet.' : `No ${currentFilter} yet.`}</p>
            </div>
        `;
        return;
    }
    
    applicationsList.innerHTML = filteredApps.map(app => `
        <div class="application-card ${selectedApplications.has(app.id) ? 'selected' : ''}" data-id="${app.id}">
            <div class="application-header">
                <div class="application-info">
                    <input type="checkbox" class="app-checkbox" data-id="${app.id}" ${selectedApplications.has(app.id) ? 'checked' : ''} onchange="toggleSelection(${app.id})">
                    <div>
                        <h3>${app.company}</h3>
                        <p class="position">${app.position}${app.location ? ` • ${app.location}` : ''}</p>
                    </div>
                </div>
                <div class="application-actions">
                    <select class="status-select status-${app.status}" onchange="updateStatus(${app.id}, this.value)">
                        <option value="Applied" ${app.status === 'Applied' ? 'selected' : ''}>Applied</option>
                        <option value="Interview" ${app.status === 'Interview' ? 'selected' : ''}>Interview</option>
                        <option value="Offer" ${app.status === 'Offer' ? 'selected' : ''}>Offer</option>
                        <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                        <option value="Ghosted" ${app.status === 'Ghosted' ? 'selected' : ''}>Ghosted</option>
                    </select>
                    <button class="btn-delete" onclick="deleteApplication(${app.id})">Delete</button>
                </div>
            </div>
            <div class="application-details">
                <span class="detail-label">Date Applied:</span>
                <span class="detail-value">${formatDate(app.date)}</span>
                ${app.salary && app.salary > 0 ? `
                    <span class="detail-label">Salary:</span>
                    <span class="detail-value">$${Number(app.salary).toLocaleString()}</span>
                ` : ''}
                ${app.coverLetter ? `
                    <span class="detail-label">Cover Letter:</span>
                    <span class="detail-value"><span class="badge-success">✓ Submitted</span></span>
                ` : ''}
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
        updateLocationFilter();
        renderApplications();
        showNotification('Application deleted');
    }
}

// Update location filter dropdown
function updateLocationFilter() {
    // Get unique locations from applications
    const locations = [...new Set(applications
        .map(app => app.location)
        .filter(loc => loc && loc.trim() !== '')
    )].sort();
    
    // Save current selection
    const currentSelection = locationFilter.value;
    
    // Update dropdown options
    locationFilter.innerHTML = '<option value="all">All Locations</option>';
    locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location;
        option.textContent = location;
        locationFilter.appendChild(option);
    });
    
    // Restore selection if it still exists
    if (locations.includes(currentSelection)) {
        locationFilter.value = currentSelection;
    } else {
        locationFilter.value = 'all';
        currentLocationFilter = 'all';
    }
}

// Update application status
function updateStatus(id, newStatus) {
    const app = applications.find(app => app.id === id);
    if (app) {
        app.status = newStatus;
        app.lastUpdated = new Date().toISOString();
        saveToLocalStorage();
        updateStats();
        renderApplications();
        showNotification(`Status updated to ${newStatus}! 🎉`);
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

// Capitalize each word in location
function capitalizeLocation(location) {
    if (!location) return '';
    return location
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// Format date
function formatDate(dateString) {
    // Split the date string to avoid timezone issues
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day);
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        timeZone: 'America/Chicago' // US Central Time
    };
    return date.toLocaleDateString('en-US', options);
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

// Bulk Actions Functions
function toggleSelection(id) {
    if (selectedApplications.has(id)) {
        selectedApplications.delete(id);
    } else {
        selectedApplications.add(id);
    }
    updateBulkActionsUI();
    renderApplications();
}

function updateBulkActionsUI() {
    const count = selectedApplications.size;
    if (count > 0) {
        bulkActionsDiv.style.display = 'block';
        selectedCountSpan.textContent = `${count} selected`;
    } else {
        bulkActionsDiv.style.display = 'none';
    }
}

function bulkUpdateStatus(newStatus) {
    selectedApplications.forEach(id => {
        const app = applications.find(a => a.id === id);
        if (app) {
            app.status = newStatus;
            app.lastUpdated = new Date().toISOString();
        }
    });
    
    saveToLocalStorage();
    updateStats();
    updateLocationFilter();
    renderApplications();
    showNotification(`Updated ${selectedApplications.size} application(s) to ${newStatus}`);
}

function bulkDelete() {
    if (!confirm(`Are you sure you want to delete ${selectedApplications.size} application(s)?`)) {
        return;
    }
    
    applications = applications.filter(app => !selectedApplications.has(app.id));
    selectedApplications.clear();
    
    saveToLocalStorage();
    updateStats();
    updateLocationFilter();
    renderApplications();
    updateBulkActionsUI();
    showNotification('Applications deleted successfully');
}

function clearSelection() {
    selectedApplications.clear();
    updateBulkActionsUI();
    renderApplications();
}