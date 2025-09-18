// Global variables
let currentTab = 'matches';
let ratingCategories = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadRatingCategories();
    autoFetchMatches();
});

// Tab management
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[onclick="showTab('${tabName}')"]`).classList.add('active');
    
    currentTab = tabName;
    
    // Load appropriate data
    switch(tabName) {
        case 'matches':
            loadMatches();
            break;
        case 'top-rated':
            loadTopRated();
            break;
        case 'premier-league':
            loadCompetitionMatches('Premier League');
            break;
        case 'champions-league':
            loadCompetitionMatches('Champions League');
            break;
    }
}

// Load rating categories
async function loadRatingCategories() {
    try {
        const response = await fetch('/api/rating-categories');
        const data = await response.json();
        ratingCategories = data.categories;
    } catch (error) {
        console.error('Error loading rating categories:', error);
    }
}

// Load all matches
async function loadMatches() {
    const container = document.getElementById('matches-list');
    container.innerHTML = '<div class="loading">Loading matches...</div>';
    
    try {
        const response = await fetch('/api/matches');
        const matches = await response.json();
        displayMatches(matches, container);
    } catch (error) {
        console.error('Error loading matches:', error);
        container.innerHTML = '<div class="error-message">Failed to load matches</div>';
    }
}

// Load top rated matches
async function loadTopRated() {
    const container = document.getElementById('top-rated-list');
    container.innerHTML = '<div class="loading">Loading top rated matches...</div>';
    
    try {
        const response = await fetch('/api/matches/top-rated?limit=20');
        const matches = await response.json();
        displayMatches(matches, container);
    } catch (error) {
        console.error('Error loading top rated matches:', error);
        container.innerHTML = '<div class="error-message">Failed to load top rated matches</div>';
    }
}

// Load matches by competition
async function loadCompetitionMatches(competition) {
    const container = document.getElementById(`${competition.toLowerCase().replace(' ', '-')}-list`);
    container.innerHTML = '<div class="loading">Loading matches...</div>';
    
    try {
        const response = await fetch(`/api/matches/competition/${encodeURIComponent(competition)}`);
        const matches = await response.json();
        displayMatches(matches, container);
    } catch (error) {
        console.error('Error loading competition matches:', error);
        container.innerHTML = '<div class="error-message">Failed to load matches</div>';
    }
}

// Auto-fetch matches on page load
async function autoFetchMatches() {
    updateStatus('Fetching latest matches...', 'loading');
    
    try {
        const response = await fetch('/api/matches/fetch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ days: 7 })
        });
        
        const data = await response.json();
        
        updateStatus(`✅ ${data.message}`, 'success');
        updateLastUpdated();
        
        // Load all tabs with fresh data
        loadMatches();
        loadTopRated();
        loadCompetitionMatches('Premier League');
        loadCompetitionMatches('Champions League');
        
    } catch (error) {
        console.error('Error fetching matches:', error);
        updateStatus('❌ Failed to fetch matches', 'error');
        
        // Still try to load existing data
        loadMatches();
    }
}

// Update status bar
function updateStatus(message, type = '') {
    const statusBar = document.getElementById('status-bar');
    const statusText = document.getElementById('status-text');
    
    statusText.textContent = message;
    statusBar.className = `status-bar ${type}`;
}

// Update last updated timestamp
function updateLastUpdated() {
    const lastUpdated = document.getElementById('last-updated');
    const now = new Date();
    lastUpdated.textContent = `Last updated: ${now.toLocaleTimeString()}`;
}

// Display matches in a container
function displayMatches(matches, container) {
    if (matches.length === 0) {
        container.innerHTML = '<div class="loading">No matches found</div>';
        return;
    }
    
    container.innerHTML = matches.map(match => createMatchCard(match)).join('');
}

// Create a match card HTML
function createMatchCard(match) {
    const rating = match.rating || { totalScore: 0, category: 'Unknown', breakdown: { goalVolume: 0, goalTiming: 0, goalDistribution: 0 } };
    const categoryClass = rating.category ? `rating-${rating.category.toLowerCase().replace(' ', '-')}` : 'rating-unknown';
    const date = new Date(match.date).toLocaleDateString();
    
    return `
        <div class="match-card">
            <div class="match-header">
                <div class="match-teams">${match.homeTeam} vs ${match.awayTeam}</div>
            </div>
            
            <div class="match-date">${date}</div>
            <div class="match-competition">${match.competition}</div>
            
            <div class="rating-section">
                <div class="rating-score">
                    <span class="rating-number">${rating.totalScore}</span>
                    <span class="rating-category ${categoryClass}">${rating.category}</span>
                </div>
                
                <div class="rating-breakdown">
                    <div class="breakdown-item">
                        <div class="breakdown-label">Goal Volume</div>
                        <div class="breakdown-value">${rating.breakdown.goalVolume}</div>
                    </div>
                    <div class="breakdown-item">
                        <div class="breakdown-label">Goal Timing</div>
                        <div class="breakdown-value">${rating.breakdown.goalTiming}</div>
                    </div>
                    <div class="breakdown-item">
                        <div class="breakdown-label">Distribution</div>
                        <div class="breakdown-value">${rating.breakdown.goalDistribution}</div>
                    </div>
                </div>
            </div>
            
        </div>
    `;
}

// Utility function to get rating color
function getRatingColor(score) {
    const category = ratingCategories.find(cat => 
        score >= cat.min && score <= cat.max
    );
    return category ? category.color : '#64748b';
}
