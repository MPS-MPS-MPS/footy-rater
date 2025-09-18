const axios = require('axios');

class FootballAPIService {
    constructor() {
        // Using Football-Data.org API with your token
        this.baseURL = 'https://api.football-data.org/v4';
        this.apiKey = '10ddae532c634959b5deeffb65c6b83d';
        this.headers = {
            'X-Auth-Token': this.apiKey,
            'Content-Type': 'application/json'
        };
        
        // Rate limiting: max 10 calls per minute
        this.maxCallsPerMinute = 10;
        this.callHistory = [];
        
        // Competition IDs
        this.competitions = {
            'PL': 2021,    // Premier League
            'CL': 2001     // Champions League
        };
    }

    /**
     * Rate limiting function - ensures max 10 calls per minute
     */
    async enforceRateLimit() {
        const now = Date.now();
        const oneMinuteAgo = now - (60 * 1000);
        
        // Remove calls older than 1 minute
        this.callHistory = this.callHistory.filter(timestamp => timestamp > oneMinuteAgo);
        
        // Check if we've hit the rate limit
        if (this.callHistory.length >= this.maxCallsPerMinute) {
            const oldestCall = Math.min(...this.callHistory);
            const waitTime = (oldestCall + (60 * 1000)) - now;
            
            if (waitTime > 0) {
                console.log(`⏳ Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                // Clean up old calls after waiting
                this.callHistory = this.callHistory.filter(timestamp => timestamp > Date.now() - (60 * 1000));
            }
        }
        
        // Record this call
        this.callHistory.push(now);
    }

    /**
     * Make API request with rate limiting
     */
    async makeAPIRequest(url, params = {}) {
        await this.enforceRateLimit();
        
        try {
            console.log(`🌐 Making API request to: ${url}`);
            const response = await axios.get(url, {
                headers: this.headers,
                params: params
            });
            
            console.log(`✅ API request successful. Rate limit: ${this.callHistory.length}/${this.maxCallsPerMinute}`);
            return response.data;
        } catch (error) {
            console.error('❌ API request failed:', error.response?.status, error.response?.statusText);
            throw error;
        }
    }

    /**
     * Get Premier League matches for a specific date range
     */
    async getPremierLeagueMatches(dateFrom, dateTo) {
        try {
            const url = `${this.baseURL}/competitions/${this.competitions.PL}/matches`;
            const data = await this.makeAPIRequest(url, {
                dateFrom,
                dateTo
            });
            
            return this.formatMatches(data.matches || []);
        } catch (error) {
            console.error('Error fetching Premier League matches:', error.message);
            return [];
        }
    }

    /**
     * Get Champions League matches for a specific date range
     */
    async getChampionsLeagueMatches(dateFrom, dateTo) {
        try {
            const url = `${this.baseURL}/competitions/${this.competitions.CL}/matches`;
            const data = await this.makeAPIRequest(url, {
                dateFrom,
                dateTo
            });
            
            return this.formatMatches(data.matches || []);
        } catch (error) {
            console.error('Error fetching Champions League matches:', error.message);
            return [];
        }
    }

    /**
     * Get recent matches from multiple competitions
     */
    async getRecentMatches(days = 7) {
        const today = new Date();
        const dateFrom = new Date(today.getTime() - (days * 24 * 60 * 60 * 1000));
        const dateTo = new Date(today.getTime() + (1 * 24 * 60 * 60 * 1000)); // Include next 1 day
        
        console.log(`📅 Fetching matches from ${this.formatDate(dateFrom)} to ${this.formatDate(dateTo)}`);
        
        const [premierLeague, championsLeague] = await Promise.all([
            this.getPremierLeagueMatches(this.formatDate(dateFrom), this.formatDate(dateTo)),
            this.getChampionsLeagueMatches(this.formatDate(dateFrom), this.formatDate(dateTo))
        ]);
        
        const allMatches = [...premierLeague, ...championsLeague];
        console.log(`📊 Total matches found: ${allMatches.length}`);
        
        return allMatches;
    }

    /**
     * Get upcoming matches
     */
    async getUpcomingMatches(days = 7) {
        const today = new Date();
        const dateTo = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
        
        const [premierLeague, championsLeague] = await Promise.all([
            this.getPremierLeagueMatches(this.formatDate(today), this.formatDate(dateTo)),
            this.getChampionsLeagueMatches(this.formatDate(today), this.formatDate(dateTo))
        ]);
        
        return [...premierLeague, ...championsLeague];
    }

    /**
     * Format raw API match data into our standard format
     */
    formatMatches(matches) {
        console.log(`📋 Raw matches received: ${matches.length}`);
        
        const finishedMatches = matches.filter(match => {
            if (match.status !== 'FINISHED') {
                console.log(`⏭️ Filtering out ${match.homeTeam.name} vs ${match.awayTeam.name} - Status: ${match.status}`);
                return false;
            }
            return true;
        });
        
        console.log(`✅ Finished matches after filtering: ${finishedMatches.length}`);
        
        return finishedMatches.map(match => ({
            id: match.id,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            homeScore: match.score.fullTime.home || 0,
            awayScore: match.score.fullTime.away || 0,
            date: match.utcDate,
            status: match.status,
            competition: match.competition.name,
            goals: this.extractGoals(match)
        }));
    }

    /**
     * Extract goal information from match data
     */
    extractGoals(match) {
        const goals = [];
        
        // Use real goal data if available from the API
        if (match.goals && match.goals.length > 0) {
            match.goals.forEach(goal => {
                const isHomeTeam = goal.team.id === match.homeTeam.id;
                goals.push({
                    team: isHomeTeam ? 'home' : 'away',
                    minute: goal.minute,
                    scorer: goal.scorer.name,
                    type: goal.type || 'REGULAR'
                });
            });
            
            return goals.sort((a, b) => a.minute - b.minute);
        }
        
        // Fallback: Create dummy goal data based on final score
        // This happens when goal details aren't available
        const homeScore = match.score.fullTime.home || 0;
        const awayScore = match.score.fullTime.away || 0;
        
        for (let i = 0; i < homeScore; i++) {
            goals.push({
                team: 'home',
                minute: Math.floor(Math.random() * 90) + 1,
                scorer: 'Unknown',
                type: 'REGULAR'
            });
        }
        
        for (let i = 0; i < awayScore; i++) {
            goals.push({
                team: 'away',
                minute: Math.floor(Math.random() * 90) + 1,
                scorer: 'Unknown',
                type: 'REGULAR'
            });
        }
        
        return goals.sort((a, b) => a.minute - b.minute);
    }

    /**
     * Format date for API
     */
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    /**
     * Get detailed match information including goals
     */
    async getMatchDetails(matchId) {
        try {
            const url = `${this.baseURL}/matches/${matchId}`;
            const data = await this.makeAPIRequest(url);
            
            // Only return details for finished matches
            if (data.status !== 'FINISHED') {
                console.log(`Match ${matchId} is not finished (status: ${data.status}), skipping`);
                return null;
            }
            
            return {
                id: data.id,
                homeTeam: data.homeTeam.name,
                awayTeam: data.awayTeam.name,
                homeScore: data.score.fullTime.home || 0,
                awayScore: data.score.fullTime.away || 0,
                date: data.utcDate,
                status: data.status,
                competition: data.competition.name,
                goals: this.extractGoals(data)
            };
        } catch (error) {
            console.error('Error fetching match details:', error.message);
            return null;
        }
    }

}

module.exports = FootballAPIService;
