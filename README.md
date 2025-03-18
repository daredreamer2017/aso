# ASO Dashboard

A powerful App Store Optimization (ASO) dashboard that helps app developers analyze keyword data, predict ranking improvements, and get actionable recommendations to boost their app's visibility and installs.

## Features

- **CSV Upload**: Upload keyword data in CSV format for analysis
- **Keyword Analysis**: Analyze keyword metrics including volume, difficulty, reach, and current ranking positions
- **Ranking Predictions**: Predict ranking improvements for 3, 6, 9, and 12 months
- **Install Impact**: Estimate the impact of ranking improvements on installs
- **ASO Recommendations**: Get actionable recommendations for keyword placement
- **AI Metadata Generation**: Generate optimized app store metadata (Title, Subtitle, Keywords) based on selected keywords

## Tech Stack

- Next.js 15.2
- React 19
- TypeScript
- TailwindCSS 4
- Chart.js & React-Chartjs-2
- Papa Parse for CSV parsing
- React Dropzone for file uploads

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/aso-dashboard.git
   cd aso-dashboard
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## CSV Format

The dashboard expects CSV files with the following columns:

- `App Name`: Name of the application
- `App ID`: Unique identifier for the app
- `Store`: App store (iOS or Android)
- `Device`: Device type (e.g., iphone, android)
- `Country Code`: Country code (e.g., us, uk)
- `Language Code`: Language code (e.g., en)
- `Main App ID`: ID of the main app
- `Main App Name`: Name of the main app
- `Keyword`: The search term
- `Keyword List`: List category for the keyword
- `Starred`: Whether the keyword is starred (TRUE/FALSE)
- `Volume`: Search volume for the keyword
- `Difficulty`: How competitive the keyword is (0-100)
- `Maximum Reach`: Potential reach of the keyword
- `Branded`: Whether the keyword is branded (TRUE/FALSE)
- `Branded App ID`: App ID if the keyword is branded
- `Branded App Name`: App name if the keyword is branded
- `KEI`: Keyword Efficiency Index
- `Chance`: Probability of ranking well (0-100)
- `Relevancy Score`: How relevant the keyword is (0-100)
- `Current Rank`: Current ranking position of the keyword (optional - will be generated randomly if not provided)

## How It Works

1. **Upload CSV**: Users upload their keyword CSV file
2. **Data Processing**: The system parses and processes the data
3. **Prediction Models**: Algorithms analyze the data to predict future ranking and install impact
4. **Recommendations**: The system generates recommendations based on keyword metrics
5. **AI Metadata Generation**: Users can select keywords and generate optimized app store metadata

## AI Metadata Generation

The AI metadata generator helps create optimized app store metadata:

- **Title**: Up to 30 characters, optimized for visibility
- **Subtitle**: Up to 30 characters, highlighting key features
- **Keywords**: Up to 100 characters, comma-separated keywords including trending terms like "sahsah" and "sahseh"

## Prediction Methodology

The prediction models use the following factors:
- Keyword difficulty
- Search volume
- Relevancy score
- Current ranking position
- Historical ranking trends (would be included in a production app)

## License

MIT

## Acknowledgments

- This project was created as a demonstration of app store optimization tools
- Inspired by professional ASO tools and services
