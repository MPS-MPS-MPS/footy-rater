class FootballRatingEngine {
    constructor() {
        // Rating weights based on our simplified formula
        this.maxGoalVolumeScore = 50;
        this.maxGoalTimingScore = 25;
        this.maxGoalDistributionScore = 25;
    }

    /**
     * Calculate watchability score for a football match
     * @param {Object} matchData - Match information
     * @param {string} matchData.homeTeam - Home team name
     * @param {string} matchData.awayTeam - Away team name
     * @param {number} matchData.homeScore - Home team goals
     * @param {number} matchData.awayScore - Away team goals
     * @param {Array} matchData.goals - Array of goal objects with timing and scorer info
     * @returns {Object} Rating breakdown and total score
     */
    calculateRating(matchData) {
        const { homeTeam, awayTeam, homeScore, awayScore, goals = [] } = matchData;
        
        // Calculate each component
        const goalVolumeScore = this.calculateGoalVolumeScore(homeScore + awayScore);
        const goalTimingScore = this.calculateGoalTimingScore(goals);
        const goalDistributionScore = this.calculateGoalDistributionScore(matchData, goals);
        
        const totalScore = goalVolumeScore + goalTimingScore + goalDistributionScore;
        
        return {
            totalScore: Math.round(totalScore),
            breakdown: {
                goalVolume: Math.round(goalVolumeScore),
                goalTiming: Math.round(goalTimingScore),
                goalDistribution: Math.round(goalDistributionScore)
            },
            rating: this.getRatingCategory(totalScore),
            match: {
                homeTeam,
                awayTeam,
                score: `${homeScore}-${awayScore}`,
                totalGoals: homeScore + awayScore
            }
        };
    }

    /**
     * Calculate score based on total number of goals
     */
    calculateGoalVolumeScore(totalGoals) {
        if (totalGoals === 0) return 0;
        if (totalGoals === 1) return 5;
        if (totalGoals === 2) return 15;
        if (totalGoals === 3) return 25;
        if (totalGoals === 4) return 35;
        if (totalGoals === 5) return 45;
        return 50; // 6+ goals
    }

    /**
     * Calculate score based on when goals were scored
     */
    calculateGoalTimingScore(goals) {
        let score = 0;
        
        goals.forEach(goal => {
            const minute = goal.minute || 0;
            
            // First 15 minutes
            if (minute <= 15) {
                score += 3;
            }
            
            // Last 15 minutes (assuming 90 minute matches)
            if (minute >= 75) {
                score += 3;
            }
            
            // Injury time (90+)
            if (minute >= 90) {
                score += 5;
            }
            
            // 80th minute and beyond
            if (minute >= 80) {
                score += 2;
            }
        });
        
        return Math.min(score, this.maxGoalTimingScore);
    }

    /**
     * Calculate score based on goal distribution and match dynamics
     */
    calculateGoalDistributionScore(matchData, goals) {
        let score = 0;
        const { homeScore, awayScore } = matchData;
        
        // Both teams scored
        if (homeScore > 0 && awayScore > 0) {
            score += 15;
        }
        
        // Calculate comeback and equalizer goals
        let homeGoals = 0;
        let awayGoals = 0;
        
        goals.forEach(goal => {
            if (goal.team === 'home') {
                homeGoals++;
                // Check for comeback goals
                if (homeGoals > awayGoals && awayGoals > 0) {
                    score += 4;
                }
                // Check for equalizer
                if (homeGoals === awayGoals && awayGoals > 0) {
                    score += 3;
                }
                // Check for winning goal in final 10 minutes
                if (goal.minute >= 80 && homeGoals > awayGoals) {
                    score += 2;
                }
            } else if (goal.team === 'away') {
                awayGoals++;
                // Check for comeback goals
                if (awayGoals > homeGoals && homeGoals > 0) {
                    score += 4;
                }
                // Check for equalizer
                if (awayGoals === homeGoals && homeGoals > 0) {
                    score += 3;
                }
                // Check for winning goal in final 10 minutes
                if (goal.minute >= 80 && awayGoals > homeGoals) {
                    score += 2;
                }
            }
        });
        
        return Math.min(score, this.maxGoalDistributionScore);
    }

    /**
     * Get rating category based on total score
     */
    getRatingCategory(score) {
        if (score >= 90) return 'ALL TIME LEGENDARY';
        if (score >= 75) return 'AMAZING';
        if (score >= 60) return 'REALLY Good';
        if (score >= 30) return 'Good';
        if (score >= 15) return 'Average';
        return 'Very Poor';
    }

    /**
     * Get rating color for UI
     */
    getRatingColor(score) {
        if (score >= 90) return '#22c55e'; // Green
        if (score >= 75) return '#84cc16'; // Light green
        if (score >= 60) return '#eab308'; // Yellow
        if (score >= 40) return '#f97316'; // Orange
        if (score >= 20) return '#ef4444'; // Red
        return '#dc2626'; // Dark red
    }
}

module.exports = FootballRatingEngine;
