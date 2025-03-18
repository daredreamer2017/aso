import { KeywordData, PredictionResult, TargetRanks } from './types';

interface KeywordMetrics {
  currentRank: number;
  volume: number;
  difficulty: number;
}

const getKeywordMetrics = (data: KeywordData): KeywordMetrics => {
  const defaultRank = Math.floor(Math.random() * 100) + 1;
  const defaultVolume = Math.floor(Math.random() * 1000) + 100;
  const defaultDifficulty = Math.floor(Math.random() * 100);

  return {
    currentRank: data.currentRank ?? defaultRank,
    volume: data.volume ?? defaultVolume,
    difficulty: data.difficulty ?? defaultDifficulty,
  };
};

// Calculates predicted ranking improvement based on keyword metrics
export const predictRankingGrowth = (keyword: KeywordData, currentRank: number = 100): PredictionResult => {
  // Using a simple model for prediction based on difficulty, volume, and relevancy
  // In a real-world scenario, you would likely use more sophisticated algorithms
  const difficultyFactor = 1 - (keyword.difficulty / 100); // Higher difficulty means slower growth
  const volumeFactor = Math.min(keyword.volume / 100, 1); // Higher volume can mean more competition but also more opportunity
  const relevancyFactor = keyword.relevancyScore / 100; // Higher relevancy means better potential
  const chanceFactor = keyword.chance / 100; // Chance of ranking well
  
  // Base growth rate for keywords
  const baseGrowthRate = 0.2; // 20% improvement per quarter in ideal circumstances
  
  // Combined factor for growth prediction
  const growthFactor = baseGrowthRate * difficultyFactor * (volumeFactor * 0.5 + relevancyFactor * 0.3 + chanceFactor * 0.2);
  
  // Predicted ranks over time (lower is better)
  const threeMonthRank = Math.max(1, Math.round(currentRank * (1 - growthFactor)));
  const sixMonthRank = Math.max(1, Math.round(threeMonthRank * (1 - growthFactor)));
  const nineMonthRank = Math.max(1, Math.round(sixMonthRank * (1 - growthFactor)));
  const twelveMonthRank = Math.max(1, Math.round(nineMonthRank * (1 - growthFactor)));
  
  // Estimate install impact based on rank improvement and volume
  const calculateInstallImpact = (oldRank: number, newRank: number) => {
    if (oldRank === newRank) return 0;
    // Simple model: better ranks (especially top 10) dramatically increase installs
    const oldVisibility = oldRank <= 10 ? 0.5 - (oldRank - 1) * 0.05 : 0.1 / oldRank;
    const newVisibility = newRank <= 10 ? 0.5 - (newRank - 1) * 0.05 : 0.1 / newRank;
    const visibilityIncrease = newVisibility - oldVisibility;
    
    // Convert visibility increase to install impact based on keyword volume
    return Math.round(visibilityIncrease * keyword.volume * 100);
  };
  
  return {
    keyword: keyword.keyword,
    currentRank,
    difficulty: keyword.difficulty,
    predictedRanks: {
      threeMonths: threeMonthRank,
      sixMonths: sixMonthRank,
      nineMonths: nineMonthRank,
      twelveMonths: twelveMonthRank
    },
    predictedInstallImpact: {
      threeMonths: calculateInstallImpact(currentRank, threeMonthRank),
      sixMonths: calculateInstallImpact(currentRank, sixMonthRank),
      nineMonths: calculateInstallImpact(currentRank, nineMonthRank),
      twelveMonths: calculateInstallImpact(currentRank, twelveMonthRank)
    }
  };
};

export const generatePredictions = (
  keywordData: KeywordData[],
  targetRanks: TargetRanks
): PredictionResult[] => {
  return keywordData.map(data => {
    const metrics = getKeywordMetrics(data);
    
    // Calculate predicted ranks based on target ranks and current metrics
    const predictedRanks = {
      threeMonths: calculatePredictedRank(metrics.currentRank, targetRanks.threeMonths, metrics.difficulty),
      sixMonths: calculatePredictedRank(metrics.currentRank, targetRanks.sixMonths, metrics.difficulty),
      nineMonths: calculatePredictedRank(metrics.currentRank, targetRanks.nineMonths, metrics.difficulty),
      twelveMonths: calculatePredictedRank(metrics.currentRank, targetRanks.twelveMonths, metrics.difficulty),
    };

    // Calculate predicted installs based on rank improvements
    const predictedInstalls = {
      threeMonths: calculatePredictedInstalls(metrics.volume, metrics.currentRank, predictedRanks.threeMonths),
      sixMonths: calculatePredictedInstalls(metrics.volume, metrics.currentRank, predictedRanks.sixMonths),
      nineMonths: calculatePredictedInstalls(metrics.volume, metrics.currentRank, predictedRanks.nineMonths),
      twelveMonths: calculatePredictedInstalls(metrics.volume, metrics.currentRank, predictedRanks.twelveMonths),
    };

    return {
      keyword: data.keyword,
      currentRank: metrics.currentRank,
      predictedRanks,
      predictedInstalls,
    };
  });
};

const calculatePredictedRank = (
  currentRank: number,
  targetRank: number,
  difficulty: number
): number => {
  // Calculate predicted rank based on current rank, target rank, and difficulty
  // Higher difficulty means slower progress towards target
  const progress = Math.min(1, (100 - difficulty) / 100);
  const rankImprovement = (currentRank - targetRank) * progress;
  return Math.max(1, Math.round(currentRank - rankImprovement));
};

const calculatePredictedInstalls = (
  volume: number,
  currentRank: number,
  predictedRank: number
): number => {
  // Calculate predicted installs based on rank improvement
  // Assumes exponential increase in installs as rank improves
  const rankImprovement = currentRank - predictedRank;
  const baseMultiplier = 1.2; // 20% increase per rank improvement
  const multiplier = Math.pow(baseMultiplier, rankImprovement / 10); // Divide by 10 to smooth out the curve
  return Math.round(volume * multiplier);
};

interface RecommendationResult extends PredictionResult {
  score: number;
}

export const generateRecommendations = (keywordData: KeywordData[]): RecommendationResult[] => {
  return keywordData
    .map(data => {
      const metrics = getKeywordMetrics(data);
      
      // Calculate a score based on volume, difficulty, and current rank
      const score = calculateRecommendationScore(metrics.volume, metrics.difficulty, metrics.currentRank);

      // Generate optimistic predictions for recommended keywords
      const predictedRanks = {
        threeMonths: Math.max(1, Math.round(metrics.currentRank * 0.7)),
        sixMonths: Math.max(1, Math.round(metrics.currentRank * 0.5)),
        nineMonths: Math.max(1, Math.round(metrics.currentRank * 0.3)),
        twelveMonths: Math.max(1, Math.round(metrics.currentRank * 0.2)),
      };

      const predictedInstalls = {
        threeMonths: calculatePredictedInstalls(metrics.volume, metrics.currentRank, predictedRanks.threeMonths),
        sixMonths: calculatePredictedInstalls(metrics.volume, metrics.currentRank, predictedRanks.sixMonths),
        nineMonths: calculatePredictedInstalls(metrics.volume, metrics.currentRank, predictedRanks.nineMonths),
        twelveMonths: calculatePredictedInstalls(metrics.volume, metrics.currentRank, predictedRanks.twelveMonths),
      };

      return {
        keyword: data.keyword,
        currentRank: metrics.currentRank,
        predictedRanks,
        predictedInstalls,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
};

const calculateRecommendationScore = (
  volume: number,
  difficulty: number,
  currentRank: number
): number => {
  // Calculate a score from 0-100 based on:
  // - Higher volume is better
  // - Lower difficulty is better
  // - Lower current rank is better (already ranking well)
  
  // Normalize values to 0-1 range
  const normalizedVolume = Math.min(volume / 1000, 1);
  const normalizedDifficulty = 1 - (difficulty / 100);
  const normalizedRank = 1 - (Math.min(currentRank, 100) / 100);

  // Weight factors (adjust these to change importance)
  const volumeWeight = 0.4;
  const difficultyWeight = 0.3;
  const rankWeight = 0.3;

  // Calculate weighted score
  const score = (
    (normalizedVolume * volumeWeight) +
    (normalizedDifficulty * difficultyWeight) +
    (normalizedRank * rankWeight)
  ) * 100;

  return Math.round(score);
}; 