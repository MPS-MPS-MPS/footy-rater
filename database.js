const fs = require('fs');
const path = require('path');

class FootballDatabase {
    constructor() {
        this.matches = [];
        this.ratings = [];
        this.nextMatchId = 1;
        this.nextRatingId = 1;
        this.isVercel = process.env.NODE_ENV === 'production' && process.env.VERCEL === '1';
    }

    /**
     * Initialize database - use in-memory storage for Vercel compatibility
     */
    async initialize() {
        try {
            if (this.isVercel) {
                // In Vercel, use in-memory storage only
                console.log('Connected to in-memory database (Vercel mode)');
                this.loadInitialData();
            } else {
                // In local development, try to load from files
                this.dataDir = path.join(__dirname, 'data');
                this.matchesFile = path.join(this.dataDir, 'matches.json');
                this.ratingsFile = path.join(this.dataDir, 'ratings.json');
                
                // Create data directory if it doesn't exist
                if (!fs.existsSync(this.dataDir)) {
                    fs.mkdirSync(this.dataDir, { recursive: true });
                }

                // Load existing data
                this.loadData();
                console.log('Connected to JSON database (local mode)');
            }
            return Promise.resolve();
        } catch (err) {
            console.error('Error initializing database:', err.message);
            // Fallback to in-memory storage
            console.log('Falling back to in-memory database');
            this.loadInitialData();
            return Promise.resolve();
        }
    }

    /**
     * Load initial data for in-memory storage
     */
    loadInitialData() {
        // Initialize with sample data for Vercel deployment
        this.matches = [
            {
                id: 1,
                api_id: 537817,
                home_team: "Arsenal FC",
                away_team: "Nottingham Forest FC",
                home_score: 3,
                away_score: 0,
                date: "2025-09-13T11:30:00Z",
                status: "FINISHED",
                competition: "Premier League",
                goals: '[{"team":"home","minute":13,"scorer":"Unknown","type":"REGULAR"},{"team":"home","minute":66,"scorer":"Unknown","type":"REGULAR"},{"team":"home","minute":80,"scorer":"Unknown","type":"REGULAR"}]',
                watchability_score: 35,
                rating_category: "Good",
                created_at: "2025-09-19T01:38:50.774Z"
            },
            {
                id: 2,
                api_id: 537815,
                home_team: "AFC Bournemouth",
                away_team: "Brighton & Hove Albion FC",
                home_score: 2,
                away_score: 1,
                date: "2025-09-13T14:00:00Z",
                status: "FINISHED",
                competition: "Premier League",
                goals: '[{"team":"home","minute":15,"scorer":"Unknown","type":"REGULAR"},{"team":"home","minute":37,"scorer":"Unknown","type":"REGULAR"},{"team":"away","minute":83,"scorer":"Unknown","type":"REGULAR"}]',
                watchability_score: 48,
                rating_category: "Good",
                created_at: "2025-09-19T01:38:50.777Z"
            },
            {
                id: 3,
                api_id: 551941,
                home_team: "Juventus FC",
                away_team: "Borussia Dortmund",
                home_score: 4,
                away_score: 4,
                date: "2025-09-16T19:00:00Z",
                status: "FINISHED",
                competition: "UEFA Champions League",
                goals: '[{"team":"home","minute":12,"scorer":"Unknown","type":"REGULAR"},{"team":"away","minute":26,"scorer":"Unknown","type":"REGULAR"},{"team":"home","minute":38,"scorer":"Unknown","type":"REGULAR"},{"team":"home","minute":51,"scorer":"Unknown","type":"REGULAR"},{"team":"away","minute":55,"scorer":"Unknown","type":"REGULAR"},{"team":"away","minute":55,"scorer":"Unknown","type":"REGULAR"},{"team":"away","minute":60,"scorer":"Unknown","type":"REGULAR"},{"team":"home","minute":83,"scorer":"Unknown","type":"REGULAR"}]',
                watchability_score: 83,
                rating_category: "AMAZING",
                created_at: "2025-09-19T01:38:50.818Z"
            }
        ];
        
        this.ratings = [
            {
                id: 1,
                match_id: 1,
                goal_volume_score: 25,
                goal_timing_score: 6,
                goal_distribution_score: 4,
                total_score: 35,
                rating_category: "Good",
                created_at: "2025-09-19T01:38:50.774Z"
            },
            {
                id: 2,
                match_id: 2,
                goal_volume_score: 25,
                goal_timing_score: 9,
                goal_distribution_score: 14,
                total_score: 48,
                rating_category: "Good",
                created_at: "2025-09-19T01:38:50.777Z"
            },
            {
                id: 3,
                match_id: 3,
                goal_volume_score: 50,
                goal_timing_score: 20,
                goal_distribution_score: 13,
                total_score: 83,
                rating_category: "AMAZING",
                created_at: "2025-09-19T01:38:50.818Z"
            }
        ];
        
        this.nextMatchId = 4;
        this.nextRatingId = 4;
        
        console.log(`Initialized in-memory database with ${this.matches.length} matches and ${this.ratings.length} ratings`);
    }

    /**
     * Load data from JSON files (local development only)
     */
    loadData() {
        try {
            // Load matches
            if (fs.existsSync(this.matchesFile)) {
                const matchesData = fs.readFileSync(this.matchesFile, 'utf8');
                this.matches = JSON.parse(matchesData);
                // Set next ID based on existing data
                if (this.matches.length > 0) {
                    this.nextMatchId = Math.max(...this.matches.map(m => m.id)) + 1;
                }
            }

            // Load ratings
            if (fs.existsSync(this.ratingsFile)) {
                const ratingsData = fs.readFileSync(this.ratingsFile, 'utf8');
                this.ratings = JSON.parse(ratingsData);
                // Set next ID based on existing data
                if (this.ratings.length > 0) {
                    this.nextRatingId = Math.max(...this.ratings.map(r => r.id)) + 1;
                }
            }

            console.log(`Loaded ${this.matches.length} matches and ${this.ratings.length} ratings`);
        } catch (err) {
            console.error('Error loading data:', err.message);
            // Initialize empty arrays if files don't exist or are corrupted
            this.matches = [];
            this.ratings = [];
        }
    }

    /**
     * Save data to JSON files (local development only)
     */
    saveData() {
        if (this.isVercel) {
            // In Vercel, data is stored in-memory only
            console.log('Data saved to in-memory storage');
            return;
        }
        
        try {
            fs.writeFileSync(this.matchesFile, JSON.stringify(this.matches, null, 2));
            fs.writeFileSync(this.ratingsFile, JSON.stringify(this.ratings, null, 2));
        } catch (err) {
            console.error('Error saving data:', err.message);
            throw err;
        }
    }

    /**
     * Save match and rating data
     */
    async saveMatch(matchData, ratingData) {
        try {
            const { 
                id, homeTeam, awayTeam, homeScore, awayScore, 
                date, status, competition, goals 
            } = matchData;
            
            const { 
                totalScore, breakdown, rating 
            } = ratingData;

            console.log(`💾 Saving match to database: ${homeTeam} vs ${awayTeam}`);
            console.log(`💾 Match data:`, { id, homeTeam, awayTeam, competition });
            console.log(`💾 Rating data:`, { totalScore, breakdown, rating });

            // Check if match already exists
            const existingMatch = this.matches.find(m => m.api_id === id);
            
            if (existingMatch) {
                console.log(`💾 Match already exists with ID: ${existingMatch.id}, skipping insert`);
                return existingMatch.id;
            }
            
            // Create new match
            const newMatch = {
                id: this.nextMatchId++,
                api_id: id,
                home_team: homeTeam,
                away_team: awayTeam,
                home_score: homeScore,
                away_score: awayScore,
                date: date,
                status: status,
                competition: competition,
                goals: JSON.stringify(goals || []),
                watchability_score: totalScore,
                rating_category: rating,
                created_at: new Date().toISOString()
            };

            // Create new rating
            const newRating = {
                id: this.nextRatingId++,
                match_id: newMatch.id,
                goal_volume_score: breakdown.goalVolume,
                goal_timing_score: breakdown.goalTiming,
                goal_distribution_score: breakdown.goalDistribution,
                total_score: totalScore,
                rating_category: rating,
                created_at: new Date().toISOString()
            };

            // Add to arrays
            this.matches.push(newMatch);
            this.ratings.push(newRating);

            // Save to files
            this.saveData();

            console.log(`💾 Match inserted with ID: ${newMatch.id}`);
            console.log(`💾 Rating inserted successfully for match ID: ${newMatch.id}`);
            
            return newMatch.id;
        } catch (err) {
            console.error('❌ Error saving match:', err);
            throw err;
        }
    }

    /**
     * Get all matches with ratings
     */
    async getAllMatches() {
        try {
            console.log('🔍 Executing query to get all matches...');
            console.log(`🔍 Database returned ${this.matches.length} raw rows`);
            
            const processedMatches = this.matches.map(match => {
                console.log(`🔍 Processing row: ${match.home_team} vs ${match.away_team}, Rating: ${match.watchability_score}`);
                
                // Find corresponding rating
                const rating = this.ratings.find(r => r.match_id === match.id);
                
                // Parse goals and recalculate breakdown if needed
                const goals = JSON.parse(match.goals || '[]');
                let breakdown = {
                    goalVolume: rating?.goal_volume_score || 0,
                    goalTiming: rating?.goal_timing_score || 0,
                    goalDistribution: rating?.goal_distribution_score || 0
                };
                
                // Use stored breakdown data - don't recalculate
                
                // Handle rating data
                const ratingData = (match.watchability_score !== null || match.rating_category !== null) ? {
                    totalScore: match.watchability_score || 0,
                    breakdown: breakdown,
                    category: match.rating_category || 'Unknown'
                } : null;
                
                return {
                    id: match.id,
                    apiId: match.api_id,
                    homeTeam: match.home_team,
                    awayTeam: match.away_team,
                    homeScore: match.home_score,
                    awayScore: match.away_score,
                    date: match.date,
                    status: match.status,
                    competition: match.competition,
                    goals: JSON.parse(match.goals || '[]'),
                    rating: ratingData
                };
            });
            
            // Sort by date descending
            processedMatches.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            console.log(`🔍 Processed ${processedMatches.length} matches for API response`);
            return processedMatches;
        } catch (err) {
            console.error('❌ Database query error:', err);
            throw err;
        }
    }

    /**
     * Get matches by competition
     */
    async getMatchesByCompetition(competition) {
        try {
            console.log('🔍 Executing query to get matches by competition...');
            
            let filteredMatches = this.matches;
            
            // Handle different competition name variations
            if (competition === 'Champions League') {
                filteredMatches = this.matches.filter(m => m.competition.includes('Champions League'));
            } else if (competition === 'Premier League') {
                filteredMatches = this.matches.filter(m => m.competition.includes('Premier League'));
            } else {
                filteredMatches = this.matches.filter(m => m.competition === competition);
            }
            
            console.log(`🔍 Database returned ${filteredMatches.length} raw rows for ${competition}`);
            
            const processedMatches = filteredMatches.map(match => {
                console.log(`🔍 Processing row: ${match.home_team} vs ${match.away_team}, Rating: ${match.watchability_score}`);
                
                // Find corresponding rating
                const rating = this.ratings.find(r => r.match_id === match.id);
                
                // Parse goals and recalculate breakdown if needed
                const goals = JSON.parse(match.goals || '[]');
                let breakdown = {
                    goalVolume: rating?.goal_volume_score || 0,
                    goalTiming: rating?.goal_timing_score || 0,
                    goalDistribution: rating?.goal_distribution_score || 0
                };
                
                // Use stored breakdown data - don't recalculate
                
                // Handle rating data
                const ratingData = (match.watchability_score !== null || match.rating_category !== null) ? {
                    totalScore: match.watchability_score || 0,
                    breakdown: breakdown,
                    category: match.rating_category || 'Unknown'
                } : null;
                
                return {
                    id: match.id,
                    apiId: match.api_id,
                    homeTeam: match.home_team,
                    awayTeam: match.away_team,
                    homeScore: match.home_score,
                    awayScore: match.away_score,
                    date: match.date,
                    status: match.status,
                    competition: match.competition,
                    goals: JSON.parse(match.goals || '[]'),
                    rating: ratingData
                };
            });
            
            // Sort by date descending
            processedMatches.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            console.log(`🔍 Processed ${processedMatches.length} matches for ${competition}`);
            return processedMatches;
        } catch (err) {
            console.error('❌ Database query error:', err);
            throw err;
        }
    }

    /**
     * Get top rated matches
     */
    async getTopRatedMatches(limit = 10) {
        try {
            console.log('🔍 Executing query to get top rated matches...');
            
            // Sort matches by watchability score descending
            const sortedMatches = [...this.matches].sort((a, b) => (b.watchability_score || 0) - (a.watchability_score || 0));
            const topMatches = sortedMatches.slice(0, limit);
            
            console.log(`🔍 Database returned ${topMatches.length} raw rows for top rated`);
            
            const processedMatches = topMatches.map(match => {
                console.log(`🔍 Processing row: ${match.home_team} vs ${match.away_team}, Rating: ${match.watchability_score}`);
                
                // Find corresponding rating
                const rating = this.ratings.find(r => r.match_id === match.id);
                
                // Parse goals and recalculate breakdown if needed
                const goals = JSON.parse(match.goals || '[]');
                let breakdown = {
                    goalVolume: rating?.goal_volume_score || 0,
                    goalTiming: rating?.goal_timing_score || 0,
                    goalDistribution: rating?.goal_distribution_score || 0
                };
                
                // Use stored breakdown data - don't recalculate
                
                // Handle rating data
                const ratingData = (match.watchability_score !== null || match.rating_category !== null) ? {
                    totalScore: match.watchability_score || 0,
                    breakdown: breakdown,
                    category: match.rating_category || 'Unknown'
                } : null;
                
                return {
                    id: match.id,
                    apiId: match.api_id,
                    homeTeam: match.home_team,
                    awayTeam: match.away_team,
                    homeScore: match.home_score,
                    awayScore: match.away_score,
                    date: match.date,
                    status: match.status,
                    competition: match.competition,
                    goals: JSON.parse(match.goals || '[]'),
                    rating: ratingData
                };
            });
            
            console.log(`🔍 Processed ${processedMatches.length} top rated matches`);
            return processedMatches;
        } catch (err) {
            console.error('❌ Database query error:', err);
            throw err;
        }
    }

    /**
     * Close database connection (no-op for JSON database)
     */
    close() {
        console.log('Database connection closed');
    }
}

module.exports = FootballDatabase;
module.exports = FootballDatabase;