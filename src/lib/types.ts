export interface KeywordData {
  keyword: string;
  volume?: number;
  difficulty?: number;
  currentRank?: number;
  relevancy?: number;
  traffic?: number;
  competition?: number;
  cpc?: number;
  maximumReach?: number;
  trend?: number[];
  [key: string]: any; // Allow for any additional fields we might find in the CSV
}

export interface MetadataOption {
  title: string;
  subtitle: string;
  keywords: string[];
}

export interface ASORecommendation {
  keyword: string;
  score: number;
  recommendedField: 'title' | 'subtitle' | 'keywords';
  reason: string;
}

export interface PredictionResult {
  keyword: string;
  currentRank: number;
  predictedRanks: {
    threeMonths: number;
    sixMonths: number;
    nineMonths: number;
    twelveMonths: number;
  };
  predictedInstalls: {
    threeMonths: number;
    sixMonths: number;
    nineMonths: number;
    twelveMonths: number;
  };
}

export interface TargetRanks {
  threeMonths: number;
  sixMonths: number;
  nineMonths: number;
  twelveMonths: number;
}

export interface KeywordStats {
  volume: number;
  difficulty: number;
  chance: number;
  relevancyScore: number;
  maximumReach: number;
}

export interface MetadataField {
  name: string;
  value: string;
} 