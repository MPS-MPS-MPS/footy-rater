const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, 'footy_ratings.db');
        this.db = null;
    }

    /**
     * Initialize database connection and create tables
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err.message);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    /**
     * Create necessary tables
     */
    async createTables() {
        return new Promise((resolve, reject) => {
            const createMatchesTable = `
                CREATE TABLE IF NOT EXISTS matches (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    api_id INTEGER UNIQUE,
                    home_team TEXT NOT NULL,
                    away_team TEXT NOT NULL,
                    home_score INTEGER NOT NULL,
                    away_score INTEGER NOT NULL,
                    date TEXT NOT NULL,
                    status TEXT NOT NULL,
                    competition TEXT NOT NULL,
                    goals TEXT, -- JSON string of goals array
                    watchability_score INTEGER,
                    rating_category TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            const createRatingsTable = `
                CREATE TABLE IF NOT EXISTS ratings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    match_id INTEGER,
                    goal_volume_score INTEGER,
                    goal_timing_score INTEGER,
                    goal_distribution_score INTEGER,
                    total_score INTEGER,
                    rating_category TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (match_id) REFERENCES matches (id)
                )
            `;

            this.db.exec(createMatchesTable + ';' + createRatingsTable, (err) => {
                if (err) {
                    console.error('Error creating tables:', err.message);
                    reject(err);
                } else {
                    console.log('Database tables created successfully');
                    resolve();
                }
            });
        });
    }

    /**
     * Save match and rating data
     */
    async saveMatch(matchData, ratingData) {
        return new Promise((resolve, reject) => {
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

            const goalsJson = JSON.stringify(goals || []);

            // First check if match already exists
            const checkMatch = `SELECT id FROM matches WHERE api_id = ?`;
            
            this.db.get(checkMatch, [id], (err, row) => {
                if (err) {
                    console.error('❌ Error checking existing match:', err);
                    reject(err);
                    return;
                }
                
                if (row) {
                    console.log(`💾 Match already exists with ID: ${row.id}, skipping insert`);
                    resolve(row.id);
                    return;
                }
                
                // Match doesn't exist, insert it
                const insertMatch = `
                    INSERT INTO matches 
                    (api_id, home_team, away_team, home_score, away_score, 
                     date, status, competition, goals, watchability_score, rating_category)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const insertRating = `
                    INSERT INTO ratings 
                    (match_id, goal_volume_score, goal_timing_score, goal_distribution_score, 
                     total_score, rating_category)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;

                    const db = this.db; // Store reference to avoid context issues
                    db.run(insertMatch, [
                        id, homeTeam, awayTeam, homeScore, awayScore,
                        date, status, competition, goalsJson, totalScore, rating
                    ], function(err) {
                        if (err) {
                            console.error('❌ Error inserting match:', err);
                            reject(err);
                        } else {
                            const matchId = this.lastID;
                            console.log(`💾 Match inserted with ID: ${matchId}`);
                            
                            // Insert rating details
                            db.run(insertRating, [
                                matchId, breakdown.goalVolume, breakdown.goalTiming,
                                breakdown.goalDistribution, totalScore, rating
                            ], (err) => {
                                if (err) {
                                    console.error('❌ Error inserting rating:', err);
                                    reject(err);
                                } else {
                                    console.log(`💾 Rating inserted successfully for match ID: ${matchId}`);
                                    resolve(matchId);
                                }
                            });
                        }
                    });
            });
        });
    }

    /**
     * Get all matches with ratings
     */
    async getAllMatches() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT m.*, 
                       m.watchability_score as total_score,
                       m.rating_category,
                       COALESCE(r.goal_volume_score, 0) as goal_volume_score,
                       COALESCE(r.goal_timing_score, 0) as goal_timing_score,
                       COALESCE(r.goal_distribution_score, 0) as goal_distribution_score
                FROM matches m
                LEFT JOIN ratings r ON m.id = r.match_id
                ORDER BY m.date DESC
            `;

            console.log('🔍 Executing query to get all matches...');

            this.db.all(query, [], (err, rows) => {
                if (err) {
                    console.error('❌ Database query error:', err);
                    reject(err);
                } else {
                    console.log(`🔍 Database returned ${rows.length} raw rows`);
                    
                    const processedMatches = rows.map(row => {
                        console.log(`🔍 Processing row: ${row.home_team} vs ${row.away_team}, Rating: ${row.total_score}`);
                        
                        // Parse goals and recalculate breakdown if needed
                        const goals = JSON.parse(row.goals || '[]');
                        let breakdown = {
                            goalVolume: row.goal_volume_score || 0,
                            goalTiming: row.goal_timing_score || 0,
                            goalDistribution: row.goal_distribution_score || 0
                        };
                        
                        // If breakdown is all zeros, recalculate it from goals
                        if (breakdown.goalVolume === 0 && breakdown.goalTiming === 0 && breakdown.goalDistribution === 0 && goals.length > 0) {
                            const totalGoals = row.home_score + row.away_score;
                            
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
                            if (row.home_score > 0 && row.away_score > 0) distributionScore += 15;
                            
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
                        const rating = (row.total_score !== null || row.rating_category !== null) ? {
                            totalScore: row.total_score || row.watchability_score || 0,
                            breakdown: breakdown,
                            category: row.rating_category || 'Unknown'
                        } : null;
                        
                        return {
                            id: row.id,
                            apiId: row.api_id,
                            homeTeam: row.home_team,
                            awayTeam: row.away_team,
                            homeScore: row.home_score,
                            awayScore: row.away_score,
                            date: row.date,
                            status: row.status,
                            competition: row.competition,
                            goals: JSON.parse(row.goals || '[]'),
                            rating: rating
                        };
                    });
                    
                    console.log(`🔍 Processed ${processedMatches.length} matches for API response`);
                    resolve(processedMatches);
                }
            });
        });
    }

    /**
     * Get matches by competition
     */
    async getMatchesByCompetition(competition) {
        return new Promise((resolve, reject) => {
            // Handle different competition name variations
            let competitionFilter;
            if (competition === 'Champions League') {
                competitionFilter = "m.competition LIKE '%Champions League%'";
            } else if (competition === 'Premier League') {
                competitionFilter = "m.competition LIKE '%Premier League%'";
            } else {
                competitionFilter = "m.competition = ?";
            }

            const query = `
                SELECT m.*, 
                       m.watchability_score as total_score,
                       m.rating_category,
                       COALESCE(r.goal_volume_score, 0) as goal_volume_score,
                       COALESCE(r.goal_timing_score, 0) as goal_timing_score,
                       COALESCE(r.goal_distribution_score, 0) as goal_distribution_score
                FROM matches m
                LEFT JOIN ratings r ON m.id = r.match_id
                WHERE ${competitionFilter}
                ORDER BY m.date DESC
            `;

            console.log('🔍 Executing query to get matches by competition...');

            const queryParams = competitionFilter.includes('?') ? [competition] : [];
            this.db.all(query, queryParams, (err, rows) => {
                if (err) {
                    console.error('❌ Database query error:', err);
                    reject(err);
                } else {
                    console.log(`🔍 Database returned ${rows.length} raw rows for ${competition}`);
                    
                    const processedMatches = rows.map(row => {
                        console.log(`🔍 Processing row: ${row.home_team} vs ${row.away_team}, Rating: ${row.total_score}`);
                        
                        // Parse goals and recalculate breakdown if needed
                        const goals = JSON.parse(row.goals || '[]');
                        let breakdown = {
                            goalVolume: row.goal_volume_score || 0,
                            goalTiming: row.goal_timing_score || 0,
                            goalDistribution: row.goal_distribution_score || 0
                        };
                        
                        // If breakdown is all zeros, recalculate it from goals
                        if (breakdown.goalVolume === 0 && breakdown.goalTiming === 0 && breakdown.goalDistribution === 0 && goals.length > 0) {
                            const totalGoals = row.home_score + row.away_score;
                            
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
                            if (row.home_score > 0 && row.away_score > 0) distributionScore += 15;
                            
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
                        const rating = (row.total_score !== null || row.rating_category !== null) ? {
                            totalScore: row.total_score || row.watchability_score || 0,
                            breakdown: breakdown,
                            category: row.rating_category || 'Unknown'
                        } : null;
                        
                        return {
                            id: row.id,
                            apiId: row.api_id,
                            homeTeam: row.home_team,
                            awayTeam: row.away_team,
                            homeScore: row.home_score,
                            awayScore: row.away_score,
                            date: row.date,
                            status: row.status,
                            competition: row.competition,
                            goals: JSON.parse(row.goals || '[]'),
                            rating: rating
                        };
                    });
                    
                    console.log(`🔍 Processed ${processedMatches.length} matches for ${competition}`);
                    resolve(processedMatches);
                }
            });
        });
    }

    /**
     * Get top rated matches
     */
    async getTopRatedMatches(limit = 10) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT m.*, 
                       m.watchability_score as total_score,
                       m.rating_category,
                       COALESCE(r.goal_volume_score, 0) as goal_volume_score,
                       COALESCE(r.goal_timing_score, 0) as goal_timing_score,
                       COALESCE(r.goal_distribution_score, 0) as goal_distribution_score
                FROM matches m
                LEFT JOIN ratings r ON m.id = r.match_id
                ORDER BY m.watchability_score DESC
                LIMIT ?
            `;

            console.log('🔍 Executing query to get top rated matches...');

            this.db.all(query, [limit], (err, rows) => {
                if (err) {
                    console.error('❌ Database query error:', err);
                    reject(err);
                } else {
                    console.log(`🔍 Database returned ${rows.length} raw rows for top rated`);
                    
                    const processedMatches = rows.map(row => {
                        console.log(`🔍 Processing row: ${row.home_team} vs ${row.away_team}, Rating: ${row.total_score}`);
                        
                        // Parse goals and recalculate breakdown if needed
                        const goals = JSON.parse(row.goals || '[]');
                        let breakdown = {
                            goalVolume: row.goal_volume_score || 0,
                            goalTiming: row.goal_timing_score || 0,
                            goalDistribution: row.goal_distribution_score || 0
                        };
                        
                        // If breakdown is all zeros, recalculate it from goals
                        if (breakdown.goalVolume === 0 && breakdown.goalTiming === 0 && breakdown.goalDistribution === 0 && goals.length > 0) {
                            const totalGoals = row.home_score + row.away_score;
                            
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
                            if (row.home_score > 0 && row.away_score > 0) distributionScore += 15;
                            
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
                        const rating = (row.total_score !== null || row.rating_category !== null) ? {
                            totalScore: row.total_score || row.watchability_score || 0,
                            breakdown: breakdown,
                            category: row.rating_category || 'Unknown'
                        } : null;
                        
                        return {
                            id: row.id,
                            apiId: row.api_id,
                            homeTeam: row.home_team,
                            awayTeam: row.away_team,
                            homeScore: row.home_score,
                            awayScore: row.away_score,
                            date: row.date,
                            status: row.status,
                            competition: row.competition,
                            goals: JSON.parse(row.goals || '[]'),
                            rating: rating
                        };
                    });
                    
                    console.log(`🔍 Processed ${processedMatches.length} top rated matches`);
                    resolve(processedMatches);
                }
            });
        });
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
    }
}

module.exports = Database;
