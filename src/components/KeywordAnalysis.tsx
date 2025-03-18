import React, { useState, useEffect } from 'react';
import { KeywordData, PredictionResult, ASORecommendation } from '../lib/types';
import { predictRankingGrowth, generateRecommendations } from '../lib/prediction';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface KeywordAnalysisProps {
  keywordData: KeywordData[];
  onKeywordSelection: (keywords: string[]) => void;
}

interface Recommendation {
  keyword: string;
  reason: string;
}

const KeywordAnalysis: React.FC<KeywordAnalysisProps> = ({ keywordData, onKeywordSelection }) => {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [selectedKeywordsSet, setSelectedKeywordsSet] = useState<Set<string>>(new Set());
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [recommendations, setRecommendations] = useState<ASORecommendation[]>([]);
  const [statsTabActive, setStatsTabActive] = useState<boolean>(true);
  const [keywordRanks, setKeywordRanks] = useState<Map<string, number>>(new Map());
  
  // Add new state for target ranks
  const [targetRanks, setTargetRanks] = useState({
    threeMonths: '',
    sixMonths: '',
    nineMonths: '',
    twelveMonths: ''
  });
  
  // Add state for target-based install predictions
  const [targetInstalls, setTargetInstalls] = useState({
    threeMonths: 0,
    sixMonths: 0,
    nineMonths: 0,
    twelveMonths: 0
  });

  // Initial data processing
  useEffect(() => {
    if (keywordData.length > 0) {
      // Initialize ranks for keywords that don't have them
      const ranks = new Map<string, number>();
      keywordData.forEach(keyword => {
        if (keyword.currentRank) {
          ranks.set(keyword.keyword, keyword.currentRank);
        } else {
          ranks.set(keyword.keyword, Math.floor(Math.random() * 100) + 1);
        }
      });
      setKeywordRanks(ranks);

      const timer = setTimeout(() => {
        const newPredictions = keywordData.map(keyword => {
          const currentRank = ranks.get(keyword.keyword) || 101;
          return predictRankingGrowth(keyword, currentRank);
        });
        
        setPredictions(newPredictions);
        const recs = generateRecommendations(keywordData);
        setRecommendations(recs as ASORecommendation[]);
        setSelectedKeyword(keywordData[0].keyword);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [keywordData]);

  // Notify parent of keyword selection changes
  useEffect(() => {
    onKeywordSelection(Array.from(selectedKeywordsSet));
  }, [selectedKeywordsSet, onKeywordSelection]);

  // Handle keyword selection changes
  const toggleKeywordSelection = (keyword: string) => {
    setSelectedKeywordsSet(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyword)) {
        newSet.delete(keyword);
      } else {
        newSet.add(keyword);
      }
      return newSet;
    });
  };

  const getSelectedKeywordPrediction = () => {
    return predictions.find(p => p.keyword === selectedKeyword);
  };
  
  const getKeywordStats = () => {
    return keywordData.find(k => k.keyword === selectedKeyword);
  };
  
  const selectedPrediction = getSelectedKeywordPrediction();
  const selectedStats = getKeywordStats();
  
  // Add function to calculate installs based on target ranks
  const calculateTargetInstalls = (currentRank: number, targetRank: number, timeframe: number) => {
    const rankImprovement = currentRank - targetRank;
    // If no improvement or negative improvement, then no installs gain
    if (rankImprovement <= 0) return 0;
    // Fine tuned multiplier: non-linear scaling with exponent 1.2
    const baseMultiplier = Math.pow(timeframe / 3, 1.2);
    const stats = getKeywordStats();
    const volume = stats?.volume ?? 0;
    const difficulty = stats?.difficulty ?? 50;
    
    const potentialInstalls = Math.floor(
      (volume * rankImprovement * baseMultiplier) / (currentRank * (difficulty / 100 + 1))
    );
    
    return Math.max(0, potentialInstalls);
  };

  // Add handler for target rank inputs
  const handleTargetRankChange = (timeframe: keyof typeof targetRanks, value: string) => {
    const newValue = value === '' ? '' : Math.max(1, Math.min(100, parseInt(value) || 1));
    setTargetRanks(prev => ({ ...prev, [timeframe]: newValue }));
    
    const selectedPrediction = getSelectedKeywordPrediction();
    if (!selectedPrediction) return;

    const currentRank = selectedPrediction.currentRank;
    const months = {
      threeMonths: 3,
      sixMonths: 6,
      nineMonths: 9,
      twelveMonths: 12
    };

    if (newValue !== '') {
      const installs = calculateTargetInstalls(currentRank, Number(newValue), months[timeframe]);
      setTargetInstalls(prev => ({ ...prev, [timeframe]: installs }));
    }
  };

  const renderChart = () => {
    if (!selectedPrediction) return null;

    const rankingChartData = {
      labels: ['Current', '3 Months', '6 Months', '9 Months', '12 Months'],
      datasets: [
        {
          label: 'Predicted Ranking',
          data: [
            selectedPrediction.currentRank,
            selectedPrediction.predictedRanks.threeMonths,
            selectedPrediction.predictedRanks.sixMonths,
            selectedPrediction.predictedRanks.nineMonths,
            selectedPrediction.predictedRanks.twelveMonths
          ],
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          tension: 0.3,
        },
        {
          label: 'Target Ranking',
          data: [
            selectedPrediction.currentRank,
            targetRanks.threeMonths === '' ? null : Number(targetRanks.threeMonths),
            targetRanks.sixMonths === '' ? null : Number(targetRanks.sixMonths),
            targetRanks.nineMonths === '' ? null : Number(targetRanks.nineMonths),
            targetRanks.twelveMonths === '' ? null : Number(targetRanks.twelveMonths)
          ],
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          tension: 0.3,
          borderDash: [5, 5],
        }
      ]
    };

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Ranking Predictions</h3>
          <Line data={rankingChartData} />
        </div>
      </div>
    );
  };

  const generateRecommendations = (data: KeywordData[]): Recommendation[] => {
    return data
      .filter(k => (k.volume ?? 0) > 50 && (k.difficulty ?? 100) < 70)
      .map(k => ({
        keyword: k.keyword,
        reason: `High volume (${k.volume ?? 'N/A'}) with manageable difficulty (${k.difficulty ?? 'N/A'})`
      }))
      .slice(0, 5);
  };

  const getRankClass = (rank: number): string => {
    if (rank <= 10) return 'text-green-600 bg-green-50';
    if (rank <= 30) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const keywordRecommendations = generateRecommendations(keywordData);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Keyword Analysis</h2>
        <p className="text-gray-600">
          Analyzing {selectedKeywordsSet.size} selected keywords
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Selected Keywords Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Selected Keywords</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {Array.from(selectedKeywordsSet).map((keyword: string) => {
              const data = keywordData.find(k => k.keyword === keyword);
              if (!data) return null;

              const currentRank = keywordRanks.get(keyword) || 101;
              const rankClass = getRankClass(currentRank);

              return (
                <div key={keyword} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{keyword}</h4>
                    <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${rankClass}`}>
                      Rank #{currentRank}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Volume:</span>
                      <span className="ml-2 text-gray-900">{data.volume || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Difficulty:</span>
                      <span className="ml-2 text-gray-900">{data.difficulty || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Available Keywords */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Available Keywords</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {keywordData.map((data) => {
              const currentRank = keywordRanks.get(data.keyword) || 101;
              const rankClass = getRankClass(currentRank);
              const isSelected = selectedKeywordsSet.has(data.keyword);

              return (
                <div
                  key={data.keyword}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleKeywordSelection(data.keyword)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{data.keyword}</h4>
                    <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${rankClass}`}>
                      Rank #{currentRank}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Volume:</span>
                      <span className="ml-2 text-gray-900">{data.volume || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Difficulty:</span>
                      <span className="ml-2 text-gray-900">{data.difficulty || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-indigo-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-indigo-900 mb-4">Key Insights</h3>
        <ul className="space-y-3">
          <li className="flex items-start">
            <svg className="h-5 w-5 text-indigo-500 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-indigo-900">
              {selectedKeywordsSet.size} keywords selected for optimization
            </span>
          </li>
          <li className="flex items-start">
            <svg className="h-5 w-5 text-indigo-500 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-indigo-900">
              Average difficulty: {Math.round(keywordData.reduce((acc, k) => acc + (k.difficulty ?? 0), 0) / Math.max(1, keywordData.length))}
            </span>
          </li>
          <li className="flex items-start">
            <svg className="h-5 w-5 text-indigo-500 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-indigo-900">
              Best ranking position: #{Math.min(...Array.from(keywordRanks.values()))}
            </span>
          </li>
        </ul>
      </div>
      {selectedKeyword && renderChart()}
    </div>
  );
};

export default KeywordAnalysis; 