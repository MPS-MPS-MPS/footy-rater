// Global variables
let currentTab = 'matches';
let ratingCategories = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadRatingCategories();
    loadMatches();
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

// Fetch new matches
async function fetchMatches() {
    const days = document.getElementById('days').value;
    const resultsContainer = document.getElementById('fetch-results');
    
    resultsContainer.innerHTML = '<div class="loading">Fetching and rating matches...</div>';
    
    try {
        const response = await fetch('/api/matches/fetch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ days: parseInt(days) })
        });
        
        const data = await response.json();
        
        resultsContainer.innerHTML = `
            <div class="success-message">
                ${data.message}
            </div>
            <div class="matches-grid">
                ${data.matches.map(match => createMatchCard(match)).join('')}
            </div>
        `;
        
        // Refresh current tab
        showTab(currentTab);
        
    } catch (error) {
        console.error('Error fetching matches:', error);
        resultsContainer.innerHTML = '<div class="error-message">Failed to fetch matches</div>';
    }
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
