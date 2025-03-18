import React from 'react';
import { KeywordData } from '@/lib/types';

interface TopKeywordsProps {
  keywords: KeywordData[];
  onKeywordClick: (keyword: string) => void;
}

const TopKeywords: React.FC<TopKeywordsProps> = ({ keywords, onKeywordClick }) => {
  // Calculate keyword score based on volume, difficulty, and current rank
  const calculateKeywordScore = (keyword: KeywordData): number => {
    const volume = keyword.volume || 0;
    const difficulty = keyword.difficulty || 100;
    const currentRank = keyword.currentRank || 1000;
    
    // Higher volume, lower difficulty, and lower current rank = better score
    return (volume * 0.6) / ((difficulty / 100 + 0.5) * Math.log10(currentRank + 10));
  };

  // Sort keywords by score and get top 10
  const topKeywords = [...keywords]
    .sort((a, b) => calculateKeywordScore(b) - calculateKeywordScore(a))
    .slice(0, 10);

  const getOpportunityLabel = (score: number): string => {
    if (score > 1000) return 'Excellent';
    if (score > 500) return 'Very Good';
    if (score > 250) return 'Good';
    if (score > 100) return 'Fair';
    return 'Limited';
  };

  const getOpportunityColor = (score: number): string => {
    if (score > 1000) return 'text-green-600';
    if (score > 500) return 'text-emerald-600';
    if (score > 250) return 'text-blue-600';
    if (score > 100) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Top 10 Recommended Keywords
      </h2>
      <div className="space-y-4">
        {topKeywords.map((keyword, index) => {
          const score = calculateKeywordScore(keyword);
          return (
            <div
              key={keyword.keyword}
              className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onKeywordClick(keyword.keyword)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500 text-sm">#{index + 1}</span>
                  <h3 className="font-medium text-gray-900">{keyword.keyword}</h3>
                </div>
                <span className={`text-sm font-medium ${getOpportunityColor(score)}`}>
                  {getOpportunityLabel(score)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Volume</span>
                  <p className="font-medium text-gray-900">
                    {keyword.volume?.toLocaleString() || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Difficulty</span>
                  <p className="font-medium text-gray-900">
                    {keyword.difficulty || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Current Rank</span>
                  <p className="font-medium text-gray-900">
                    #{keyword.currentRank || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className="bg-indigo-600 rounded-full h-1"
                    style={{
                      width: `${Math.min(100, (score / 1500) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TopKeywords; 