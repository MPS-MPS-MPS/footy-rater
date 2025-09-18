const fs = require('fs');
const path = require('path');

class FootballDatabase {
    constructor() {
        this.dataDir = path.join(__dirname, 'data');
        this.matchesFile = path.join(this.dataDir, 'matches.json');
        this.ratingsFile = path.join(this.dataDir, 'ratings.json');
        this.matches = [];
        this.ratings = [];
        this.nextMatchId = 1;
        this.nextRatingId = 1;
    }

    /**
     * Initialize database and create data directory
     */
    async initialize() {
        try {
            // Create data directory if it doesn't exist
            if (!fs.existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir, { recursive: true });
            }

            // Load existing data
            this.loadData();
            console.log('Connected to JSON database');
            return Promise.resolve();
        } catch (err) {
            console.error('Error initializing database:', err.message);
            return Promise.reject(err);
        }
    }

    /**
     * Load data from JSON files
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
     * Save data to JSON files
     */
    saveData() {
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
                
                // If breakdown is all zeros, recalculate it from goals
                if (breakdown.goalVolume === 0 && breakdown.goalTiming === 0 && breakdown.goalDistribution === 0 && goals.length > 0) {
                    const totalGoals = match.home_score + match.away_score;
                    
                    // Calculate goal volume score
                    if (totalGoals === 0) breakdown.goalVolume = 0;
                    else if (totalGoals === 1) breakdown.goalVolume = 5;
                    else if (totalGoals === 2) breakdown.goalVolume = 15;
                    else if (totalGoals === 3) breakdown.goalVolume = 25;
                    else if (totalGoals === 4) breakdown.goalVolume = 35;
                    else if (totalGoals === 5) breakdown.goalVolume = 45;
                    else breakdown.goalVolume = 50;
                    
                    // Calculate goal timing score
                    let timingScore = 0;
                    goals.forEach(goal => {
                        const minute = goal.minute || 0;
                        if (minute <= 15) timingScore += 3;
                        if (minute >= 75) timingScore += 3;
                        if (minute >= 90) timingScore += 5;
                        if (minute >= 80) timingScore += 2;
                    });
                    breakdown.goalTiming = Math.min(timingScore, 25);
                    
                    // Calculate goal distribution score
                    let distributionScore = 0;
                    if (match.home_score > 0 && match.away_score > 0) distributionScore += 15;
                    
                    let homeGoals = 0, awayGoals = 0;
                    goals.forEach(goal => {
                        if (goal.team === 'home') {
                            homeGoals++;
                            if (homeGoals > awayGoals && awayGoals > 0) distributionScore += 4;
                            if (homeGoals === awayGoals && awayGoals > 0) distributionScore += 3;
                            if (goal.minute >= 80 && homeGoals > awayGoals) distributionScore += 2;
                        } else if (goal.team === 'away') {
                            awayGoals++;
                            if (awayGoals > homeGoals && homeGoals > 0) distributionScore += 4;
                            if (awayGoals === homeGoals && homeGoals > 0) distributionScore += 3;
                            if (goal.minute >= 80 && awayGoals > homeGoals) distributionScore += 2;
                        }
                    });
                    breakdown.goalDistribution = Math.min(distributionScore, 25);
                }
                
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
                
                // If breakdown is all zeros, recalculate it from goals
                if (breakdown.goalVolume === 0 && breakdown.goalTiming === 0 && breakdown.goalDistribution === 0 && goals.length > 0) {
                    const totalGoals = match.home_score + match.away_score;
                    
                    // Calculate goal volume score
                    if (totalGoals === 0) breakdown.goalVolume = 0;
                    else if (totalGoals === 1) breakdown.goalVolume = 5;
                    else if (totalGoals === 2) breakdown.goalVolume = 15;
                    else if (totalGoals === 3) breakdown.goalVolume = 25;
                    else if (totalGoals === 4) breakdown.goalVolume = 35;
                    else if (totalGoals === 5) breakdown.goalVolume = 45;
                    else breakdown.goalVolume = 50;
                    
                    // Calculate goal timing score
                    let timingScore = 0;
                    goals.forEach(goal => {
                        const minute = goal.minute || 0;
                        if (minute <= 15) timingScore += 3;
                        if (minute >= 75) timingScore += 3;
                        if (minute >= 90) timingScore += 5;
                        if (minute >= 80) timingScore += 2;
                    });
                    breakdown.goalTiming = Math.min(timingScore, 25);
                    
                    // Calculate goal distribution score
                    let distributionScore = 0;
                    if (match.home_score > 0 && match.away_score > 0) distributionScore += 15;
                    
                    let homeGoals = 0, awayGoals = 0;
                    goals.forEach(goal => {
                        if (goal.team === 'home') {
                            homeGoals++;
                            if (homeGoals > awayGoals && awayGoals > 0) distributionScore += 4;
                            if (homeGoals === awayGoals && awayGoals > 0) distributionScore += 3;
                            if (goal.minute >= 80 && homeGoals > awayGoals) distributionScore += 2;
                        } else if (goal.team === 'away') {
                            awayGoals++;
                            if (awayGoals > homeGoals && homeGoals > 0) distributionScore += 4;
                            if (awayGoals === homeGoals && homeGoals > 0) distributionScore += 3;
                            if (goal.minute >= 80 && awayGoals > homeGoals) distributionScore += 2;
                        }
                    });
                    breakdown.goalDistribution = Math.min(distributionScore, 25);
                }
                
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
                
                // If breakdown is all zeros, recalculate it from goals
                if (breakdown.goalVolume === 0 && breakdown.goalTiming === 0 && breakdown.goalDistribution === 0 && goals.length > 0) {
                    const totalGoals = match.home_score + match.away_score;
                    
                    // Calculate goal volume score
                    if (totalGoals === 0) breakdown.goalVolume = 0;
                    else if (totalGoals === 1) breakdown.goalVolume = 5;
                    else if (totalGoals === 2) breakdown.goalVolume = 15;
                    else if (totalGoals === 3) breakdown.goalVolume = 25;
                    else if (totalGoals === 4) breakdown.goalVolume = 35;
                    else if (totalGoals === 5) breakdown.goalVolume = 45;
                    else breakdown.goalVolume = 50;
                    
                    // Calculate goal timing score
                    let timingScore = 0;
                    goals.forEach(goal => {
                        const minute = goal.minute || 0;
                        if (minute <= 15) timingScore += 3;
                        if (minute >= 75) timingScore += 3;
                        if (minute >= 90) timingScore += 5;
                        if (minute >= 80) timingScore += 2;
                    });
                    breakdown.goalTiming = Math.min(timingScore, 25);
                    
                    // Calculate goal distribution score
                    let distributionScore = 0;
                    if (match.home_score > 0 && match.away_score > 0) distributionScore += 15;
                    
                    let homeGoals = 0, awayGoals = 0;
                    goals.forEach(goal => {
                        if (goal.team === 'home') {
                            homeGoals++;
                            if (homeGoals > awayGoals && awayGoals > 0) distributionScore += 4;
                            if (homeGoals === awayGoals && awayGoals > 0) distributionScore += 3;
                            if (goal.minute >= 80 && homeGoals > awayGoals) distributionScore += 2;
                        } else if (goal.team === 'away') {
                            awayGoals++;
                            if (awayGoals > homeGoals && homeGoals > 0) distributionScore += 4;
                            if (awayGoals === homeGoals && homeGoals > 0) distributionScore += 3;
                            if (goal.minute >= 80 && awayGoals > homeGoals) distributionScore += 2;
                        }
                    });
                    breakdown.goalDistribution = Math.min(distributionScore, 25);
                }
                
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