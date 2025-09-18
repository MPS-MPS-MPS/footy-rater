const express = require('express');
const cors = require('cors');
const path = require('path');
const FootballRatingEngine = require('./ratingEngine');
const FootballAPIService = require('./apiService');
const Database = require('./database');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize services
const ratingEngine = new FootballRatingEngine();
const apiService = new FootballAPIService();
const database = new Database();

// Initialize database
database.initialize().catch(console.error);

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get all matches with ratings
app.get('/api/matches', async (req, res) => {
    try {
        console.log('📊 Fetching all matches from database...');
        const matches = await database.getAllMatches();
        console.log(`📊 Found ${matches.length} matches in database`);
        if (matches.length > 0) {
            console.log('📊 Sample match:', {
                id: matches[0].id,
                teams: `${matches[0].homeTeam} vs ${matches[0].awayTeam}`,
                rating: matches[0].rating?.totalScore
            });
        }
        res.json(matches);
    } catch (error) {
        console.error('❌ Error fetching matches:', error);
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

// Get matches by competition
app.get('/api/matches/competition/:competition', async (req, res) => {
    try {
        const { competition } = req.params;
        const matches = await database.getMatchesByCompetition(competition);
        res.json(matches);
    } catch (error) {
        console.error('Error fetching matches by competition:', error);
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

// Get top rated matches
app.get('/api/matches/top-rated', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const matches = await database.getTopRatedMatches(limit);
        res.json(matches);
    } catch (error) {
        console.error('Error fetching top rated matches:', error);
        res.status(500).json({ error: 'Failed to fetch top rated matches' });
    }
});

// Fetch and rate new matches
app.post('/api/matches/fetch', async (req, res) => {
    try {
        const { days = 7 } = req.body;
        console.log(`🔄 Fetching matches - Days: ${days}`);
        
        // Fetch from real API
        console.log('🌐 Fetching from real API...');
        const matches = await apiService.getRecentMatches(days);
        
        console.log(`📋 Found ${matches.length} matches to process`);
        
        const ratedMatches = [];
        
        for (const match of matches) {
            // Only process finished matches
            if (match.status !== 'FINISHED') {
                console.log(`⏭️ Skipping ${match.homeTeam} vs ${match.awayTeam} - Status: ${match.status}`);
                continue;
            }
            
            console.log(`⚽ Processing: ${match.homeTeam} vs ${match.awayTeam}`);
            
            // Calculate rating
            const rating = ratingEngine.calculateRating(match);
            console.log(`📊 Rating: ${rating.totalScore}/100 (${rating.rating})`);
            
            // Save to database
            const matchId = await database.saveMatch(match, rating);
            console.log(`💾 Saved to database with ID: ${matchId}`);
            
            ratedMatches.push({
                ...match,
                rating
            });
        }
        
        console.log(`✅ Successfully processed ${ratedMatches.length} matches`);
        
        res.json({
            message: `Processed ${ratedMatches.length} matches`,
            matches: ratedMatches
        });
    } catch (error) {
        console.error('❌ Error fetching and rating matches:', error);
        res.status(500).json({ error: 'Failed to fetch and rate matches' });
    }
});

// Calculate rating for a specific match
app.post('/api/rate-match', (req, res) => {
    try {
        const matchData = req.body;
        const rating = ratingEngine.calculateRating(matchData);
        res.json(rating);
    } catch (error) {
        console.error('Error calculating rating:', error);
        res.status(500).json({ error: 'Failed to calculate rating' });
    }
});

// Get detailed match information with real goal data
app.get('/api/matches/:matchId/details', async (req, res) => {
    try {
        const { matchId } = req.params;
        console.log(`🔍 Fetching details for match ID: ${matchId}`);
        
        const matchDetails = await apiService.getMatchDetails(matchId);
        
        if (!matchDetails) {
            return res.status(404).json({ error: 'Match not found' });
        }
        
        // Calculate rating for the detailed match
        const rating = ratingEngine.calculateRating(matchDetails);
        
        res.json({
            ...matchDetails,
            rating
        });
    } catch (error) {
        console.error('Error fetching match details:', error);
        res.status(500).json({ error: 'Failed to fetch match details' });
    }
});

// Get rating categories
app.get('/api/rating-categories', (req, res) => {
    res.json({
        categories: [
            { name: 'Excellent', min: 90, max: 100, color: '#22c55e' },
            { name: 'Very Good', min: 75, max: 89, color: '#84cc16' },
            { name: 'Good', min: 60, max: 74, color: '#eab308' },
            { name: 'Average', min: 40, max: 59, color: '#f97316' },
            { name: 'Poor', min: 20, max: 39, color: '#ef4444' },
            { name: 'Very Poor', min: 0, max: 19, color: '#dc2626' }
        ]
    });
});

// Start server
app.listen(port, () => {
    console.log(`Footy Rater server running on http://localhost:${port}`);
    console.log('Available endpoints:');
    console.log('  GET  /api/matches - Get all matches');
    console.log('  GET  /api/matches/competition/:competition - Get matches by competition');
    console.log('  GET  /api/matches/top-rated - Get top rated matches');
    console.log('  GET  /api/matches/:matchId/details - Get detailed match info with real goals');
    console.log('  POST /api/matches/fetch - Fetch and rate new matches');
    console.log('  POST /api/rate-match - Calculate rating for a match');
    console.log('  GET  /api/rating-categories - Get rating categories');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    database.close();
    process.exit(0);
});
