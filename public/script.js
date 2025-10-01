// Global variables
let currentTab = 'matches';
let ratingCategories = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    const isHealthy = await checkHealth();
    loadRatingCategories();
    
    if (isHealthy) {
        // Load existing matches from database
        loadMatches();
        // Then fetch new matches in the background
        autoFetchMatches();
    }
});

// Check server health
async function checkHealth() {
    try {
        console.log('Checking server health...');
        let retries = 0;
        while (retries < 5) {
            const response = await fetch('/api/health');
            const health = await response.json();
            console.log('Health check:', health);
            
            if (health.database === 'initialized') {
                console.log('Database is ready!');
                return true;
            }
            
            updateStatus('Database initializing...', 'loading');
            await new Promise(resolve => setTimeout(resolve, 500));
            retries++;
        }
        updateStatus('Database initialization timeout', 'error');
        return false;
    } catch (error) {
        console.error('Health check failed:', error);
        updateStatus('Server connection failed', 'error');
        return false;
    }
}

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
        console.log('Fetching matches from:', '/api/matches');
        const response = await fetch('/api/matches');
        console.log('Response status:', response.status);
        
        if (response.status === 503) {
            const errorData = await response.json();
            container.innerHTML = `<div class="error-message">Database initializing... Please wait a moment and refresh.</div>`;
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const matches = await response.json();
        console.log('Received matches:', matches.length);
        console.log('Matches data:', matches);
        displayMatches(matches, container);
    } catch (error) {
        console.error('Error loading matches:', error);
        container.innerHTML = `<div class="error-message">Failed to load matches: ${error.message}</div>`;
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
        console.log('Auto-fetching matches...');
        const response = await fetch('/api/matches/fetch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ days: 7 })
        });
        
        console.log('Auto-fetch response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Auto-fetch data:', data);
        
        updateStatus(`✅ ${data.message}`, 'success');
        updateLastUpdated();
        
        // Small delay to ensure database has finished processing
        setTimeout(() => {
            // Load all tabs with fresh data
            loadMatches();
            loadTopRated();
            loadCompetitionMatches('Premier League');
            loadCompetitionMatches('Champions League');
        }, 500);
        
    } catch (error) {
        console.error('Error fetching matches:', error);
        updateStatus(`❌ Failed to fetch matches: ${error.message}`, 'error');
        
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
    const categoryClass = rating.category ? `rating-${rating.category.toLowerCase().replace(/\s+/g, '-')}` : 'rating-unknown';
    const date = new Date(match.date).toLocaleDateString();
    
    // Debug logging for Eintracht match
    if (match.homeTeam && match.homeTeam.includes('Eintracht')) {
        console.log('🔍 Eintracht match debug:', {
            homeTeam: match.homeTeam,
            rating: rating,
            category: rating.category,
            categoryClass: categoryClass,
            totalScore: rating.totalScore
        });
    }
    
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
