# Footy Rater ⚽

A lightweight football match watchability rating system that rates games based on goal-based entertainment factors.

## Features

- **Goal-Based Rating System**: Rates matches purely on goal volume, timing, and distribution
- **Premier League & Champions League**: Supports both major competitions
- **Real-time API Integration**: Fetches live match data from free APIs
- **Beautiful Web Interface**: Modern, responsive design
- **SQLite Database**: Lightweight local storage
- **Sample Data**: Includes test data for immediate use

## Rating System

The system calculates watchability scores (0-100) based on:

### Goal Volume Score (0-50 points)
- 0 goals = 0 points
- 1 goal = 5 points
- 2 goals = 15 points
- 3 goals = 25 points
- 4 goals = 35 points
- 5 goals = 45 points
- 6+ goals = 50 points

### Goal Timing Score (0-25 points)
- Goals in first 15 minutes = +3 points each
- Goals in last 15 minutes = +3 points each
- Goals in injury time = +5 points each
- Goals in 80th+ minute = +2 points each

### Goal Distribution Score (0-25 points)
- Both teams score = +15 points
- Comeback goals = +4 points each
- Equalizer goals = +3 points each
- Winning goals in final 10 minutes = +2 points each

## Rating Categories

- **Excellent (90-100)**: Must-watch matches
- **Very Good (75-89)**: Highly entertaining
- **Good (60-74)**: Worth watching
- **Average (40-59)**: Decent entertainment
- **Poor (20-39)**: Limited excitement
- **Very Poor (0-19)**: Avoid unless you're a fan

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

### 3. Open in Browser
Navigate to `http://localhost:3000`

### 4. Fetch Sample Data
- Go to the "Fetch Matches" tab
- Check "Use sample data (for testing)"
- Click "Fetch & Rate Matches"

## API Setup (Optional)

To use real match data instead of sample data:

1. Get a free API key from [Football-Data.org](https://www.football-data.org/)
2. Set the environment variable:
   ```bash
   export FOOTBALL_API_KEY=your_api_key_here
   ```
3. Uncheck "Use sample data" when fetching matches

## API Endpoints

- `GET /api/matches` - Get all matches
- `GET /api/matches/competition/:competition` - Get matches by competition
- `GET /api/matches/top-rated` - Get top rated matches
- `POST /api/matches/fetch` - Fetch and rate new matches
- `POST /api/rate-match` - Calculate rating for a match
- `GET /api/rating-categories` - Get rating categories

## Project Structure

```
footy-rater/
├── server.js              # Main server file
├── ratingEngine.js        # Core rating logic
├── apiService.js          # Football API integration
├── database.js            # SQLite database operations
├── package.json           # Dependencies
├── public/
│   ├── index.html         # Web interface
│   ├── styles.css         # Styling
│   └── script.js          # Frontend JavaScript
└── footy_ratings.db       # SQLite database (created automatically)
```

## Development

### Run in Development Mode
```bash
npm run dev
```

### Example Usage

```javascript
const FootballRatingEngine = require('./ratingEngine');

const ratingEngine = new FootballRatingEngine();

const matchData = {
    homeTeam: 'Liverpool',
    awayTeam: 'Manchester City',
    homeScore: 4,
    awayScore: 3,
    goals: [
        { team: 'home', minute: 12, scorer: 'Salah' },
        { team: 'away', minute: 28, scorer: 'Haaland' },
        // ... more goals
    ]
};

const rating = ratingEngine.calculateRating(matchData);
console.log(rating.totalScore); // 79
console.log(rating.rating); // "Very Good"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Future Enhancements

- Support for more competitions
- Historical data analysis
- Team-specific watchability ratings
- Match predictions based on past ratings
- Mobile app version
- Social sharing features
