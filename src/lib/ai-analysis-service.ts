import { ParsedAppData, KeywordData } from './flexible-csv-parser';

export interface KeywordInsights {
  trendingKeywords: KeywordData[];
  lowCompetitionOpportunities: KeywordData[];
  highVolumeKeywords: KeywordData[];
  underperformingKeywords: KeywordData[];
  keywordCategories: { [category: string]: KeywordData[] };
  summary: string;
}

export interface MetadataRecommendations {
  title: string[];
  subtitle: string[];
  keywordField: string[];
  reasoning: string;
}

export interface GrowthProjections {
  timeframes: number[]; // in months
  projectedDownloads: number[];
  projectedRankImprovements: { [keyword: string]: number[] };
}

export interface AIAnalysisResult {
  insights: KeywordInsights;
  recommendations: MetadataRecommendations;
  projections: GrowthProjections;
  missingDataWarnings: string[];
}

export async function analyzeAppData(appData: ParsedAppData): Promise<AIAnalysisResult> {
  // Determine which data is available and which is missing
  const missingDataWarnings = generateMissingDataWarnings(appData);
  
  // Generate keyword insights
  const insights = generateKeywordInsights(appData);
  
  // Generate metadata recommendations
  const recommendations = generateMetadataRecommendations(appData, insights);
  
  // Generate growth projections
  const projections = generateGrowthProjections(appData, recommendations);
  
  return {
    insights,
    recommendations,
    projections,
    missingDataWarnings
  };
}

function generateMissingDataWarnings(appData: ParsedAppData): string[] {
  const warnings: string[] = [];
  
  if (!appData.appDetails.appName) {
    warnings.push('App name is missing. Recommendations may be less targeted.');
  }
  
  if (!appData.appDetails.appId) {
    warnings.push('App ID is missing. We cannot verify if the app exists in the stores.');
  }
  
  if (!appData.appDetails.store) {
    warnings.push('Store information is missing. Recommendations are based on general app store guidelines.');
  }
  
  if (appData.keywords.length === 0) {
    warnings.push('No keywords found in the data. Please ensure your CSV contains keyword information.');
  }
  
  const missingKeywordData = [];
  if (!appData.keywords.some(k => k.volume !== undefined)) {
    missingKeywordData.push('search volume');
  }
  
  if (!appData.keywords.some(k => k.difficulty !== undefined)) {
    missingKeywordData.push('difficulty/competition');
  }
  
  if (!appData.keywords.some(k => k.currentRank !== undefined)) {
    missingKeywordData.push('current rank');
  }
  
  if (missingKeywordData.length > 0) {
    warnings.push(`Missing ${missingKeywordData.join(', ')} data for keywords. Analysis will be limited.`);
  }
  
  return warnings;
}

function generateKeywordInsights(appData: ParsedAppData): KeywordInsights {
  const { keywords } = appData;
  
  // Categorize keywords based on their text content
  const keywordCategories = categorizeKeywords(keywords);
  
  // Find trending keywords (simplified approach without historical data)
  const trendingKeywords = keywords
    .filter(k => k.volume !== undefined && k.volume > 500)
    .sort((a, b) => (b.volume || 0) - (a.volume || 0))
    .slice(0, 5);
  
  // Find low competition opportunities
  const lowCompetitionOpportunities = keywords
    .filter(k => 
      k.difficulty !== undefined && 
      k.volume !== undefined && 
      k.difficulty < 40 && 
      k.volume > 300
    )
    .sort((a, b) => (b.volume || 0) - (a.volume || 0))
    .slice(0, 5);
  
  // Find high volume keywords
  const highVolumeKeywords = keywords
    .filter(k => k.volume !== undefined)
    .sort((a, b) => (b.volume || 0) - (a.volume || 0))
    .slice(0, 5);
  
  // Find underperforming keywords (high volume but poor ranking)
  const underperformingKeywords = keywords
    .filter(k => 
      k.volume !== undefined && 
      k.currentRank !== undefined && 
      k.volume > 300 && 
      k.currentRank > 50
    )
    .sort((a, b) => (b.volume || 0) - (a.volume || 0))
    .slice(0, 5);
  
  // Generate a summary
  const summary = generateInsightsSummary(
    appData, 
    trendingKeywords, 
    lowCompetitionOpportunities, 
    highVolumeKeywords, 
    underperformingKeywords
  );
  
  return {
    trendingKeywords,
    lowCompetitionOpportunities,
    highVolumeKeywords,
    underperformingKeywords,
    keywordCategories,
    summary
  };
}

function categorizeKeywords(keywords: KeywordData[]): { [category: string]: KeywordData[] } {
  const categories: { [category: string]: KeywordData[] } = {};
  const wordFrequency: { [word: string]: number } = {};
  
  // Count word frequency across all keywords
  keywords.forEach(kw => {
    const words = kw.keyword.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (word.length > 3) { // Skip short words
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      }
    });
  });
  
  // Find common themes (words that appear in multiple keywords)
  const commonThemes = Object.entries(wordFrequency)
    .filter(([_, count]) => count >= 2)
    .map(([word]) => word);
  
  // Categorize keywords by these themes
  commonThemes.forEach(theme => {
    categories[theme] = keywords.filter(kw => 
      kw.keyword.toLowerCase().includes(theme.toLowerCase())
    );
  });
  
  // Add "other" category for keywords that don't fit any theme
  const categorizedKeywords = new Set<string>();
  Object.values(categories).forEach(categoryKeywords => {
    categoryKeywords.forEach(kw => categorizedKeywords.add(kw.keyword));
  });
  
  categories['other'] = keywords.filter(kw => !categorizedKeywords.has(kw.keyword));
  
  // Remove categories with too few keywords
  Object.keys(categories).forEach(category => {
    if (categories[category].length < 2) {
      delete categories[category];
    }
  });
  
  return categories;
}

function generateInsightsSummary(
  appData: ParsedAppData,
  trendingKeywords: KeywordData[],
  lowCompetitionOpportunities: KeywordData[],
  highVolumeKeywords: KeywordData[],
  underperformingKeywords: KeywordData[]
): string {
  const appName = appData.appDetails.appName || 'Your app';
  const totalKeywords = appData.keywords.length;
  
  // Calculate average metrics if available
  const avgVolume = appData.keywords.reduce((sum, k) => sum + (k.volume || 0), 0) / 
    (appData.keywords.filter(k => k.volume !== undefined).length || 1);
  
  const avgDifficulty = appData.keywords.reduce((sum, k) => sum + (k.difficulty || 0), 0) / 
    (appData.keywords.filter(k => k.difficulty !== undefined).length || 1);
  
  // Generate top opportunities text
  let topOpportunities = '';
  if (lowCompetitionOpportunities.length > 0) {
    topOpportunities = `Your top keyword opportunities are: ${lowCompetitionOpportunities
      .slice(0, 3)
      .map(k => `"${k.keyword}"`)
      .join(', ')}.`;
  }
  
  // Generate underperforming keywords text
  let underperforming = '';
  if (underperformingKeywords.length > 0) {
    underperforming = `You should focus on improving your ranking for: ${underperformingKeywords
      .slice(0, 3)
      .map(k => `"${k.keyword}"`)
      .join(', ')}.`;
  }
  
  return `
    We analyzed ${totalKeywords} keywords for ${appName}. 
    The average search volume is ${Math.round(avgVolume)} with an average difficulty of ${Math.round(avgDifficulty)}/100.
    ${topOpportunities}
    ${underperforming}
    By optimizing your metadata with our recommendations, you can improve visibility and increase downloads.
  `.trim().replace(/\s+/g, ' ');
}

function generateMetadataRecommendations(
  appData: ParsedAppData, 
  insights: KeywordInsights
): MetadataRecommendations {
  const appName = appData.appDetails.appName || '';
  const keywords = appData.keywords;
  
  // Helper functions to score keywords for different fields
  const scoreTitleKeyword = (kw: KeywordData): number => {
    const volume = kw.volume || 0;
    const difficulty = kw.difficulty || 50;
    const currentRank = kw.currentRank || 100;
    
    // Title should have high volume, moderate difficulty, and good current performance
    return (volume * 0.6) + ((100 - difficulty) * 0.3) + ((100 - Math.min(currentRank, 100)) * 0.1);
  };
  
  const scoreSubtitleKeyword = (kw: KeywordData): number => {
    const volume = kw.volume || 0;
    const difficulty = kw.difficulty || 50;
    
    // Subtitle should have good volume but could be more competitive
    return (volume * 0.7) + ((100 - difficulty) * 0.3);
  };
  
  const scoreKeywordFieldKeyword = (kw: KeywordData): number => {
    const volume = kw.volume || 0;
    const difficulty = kw.difficulty || 50;
    const currentRank = kw.currentRank || 100;
    
    // Keyword field should balance volume and difficulty
    return (volume * 0.5) + ((100 - difficulty) * 0.5);
  };
  
  // Get top keywords for each field
  const titleKeywords = [...keywords]
    .sort((a, b) => scoreTitleKeyword(b) - scoreTitleKeyword(a))
    .slice(0, 10);
  
  const subtitleKeywords = [...keywords]
    .sort((a, b) => scoreSubtitleKeyword(b) - scoreSubtitleKeyword(a))
    .slice(0, 15);
  
  const keywordFieldKeywords = [...keywords]
    .sort((a, b) => scoreKeywordFieldKeyword(b) - scoreKeywordFieldKeyword(a))
    .slice(0, 20);
  
  // Generate title options
  const titleOptions: string[] = [];
  if (appName) {
    // Try to incorporate top keywords with app name
    titleOptions.push(`${appName}: ${titleKeywords[0]?.keyword || ''}`);
    titleOptions.push(`${titleKeywords[0]?.keyword || ''} - ${appName}`);
    if (titleKeywords[1]) {
      titleOptions.push(`${appName} - ${titleKeywords[0]?.keyword || ''} & ${titleKeywords[1]?.keyword || ''}`);
    }
  } else {
    // Without app name, just use the top keywords
    titleOptions.push(`${titleKeywords[0]?.keyword || ''} App`);
    if (titleKeywords[1]) {
      titleOptions.push(`${titleKeywords[0]?.keyword || ''} & ${titleKeywords[1]?.keyword || ''}`);
    }
    if (titleKeywords[2]) {
      titleOptions.push(`Ultimate ${titleKeywords[0]?.keyword || ''} & ${titleKeywords[1]?.keyword || ''} Tool`);
    }
  }
  
  // Generate subtitle options
  const subtitleOptions = [
    `${subtitleKeywords[0]?.keyword || ''} ${subtitleKeywords[1]?.keyword || ''} & ${subtitleKeywords[2]?.keyword || ''}`,
    `Best ${subtitleKeywords[0]?.keyword || ''} App for ${subtitleKeywords[1]?.keyword || ''}`,
    `${subtitleKeywords[0]?.keyword || ''} Made Easy | ${subtitleKeywords[1]?.keyword || ''} & More`
  ];
  
  // Generate keyword field options
  const keywordFieldOptions = [
    keywordFieldKeywords.slice(0, 8).map(k => k.keyword).join(', '),
    keywordFieldKeywords.slice(8, 16).map(k => k.keyword).join(', '),
    keywordFieldKeywords.slice(0, 4).map(k => k.keyword).join(', ') + ', ' + 
      keywordFieldKeywords.slice(10, 14).map(k => k.keyword).join(', ')
  ];
  
  // Generate reasoning
  const reasoning = `
    The title recommendations focus on high-volume, moderately competitive keywords where you already have some ranking.
    The subtitle includes complementary keywords with good search volume to expand your visibility.
    The keyword field maximizes coverage across your most valuable keyword opportunities.
  `.trim().replace(/\s+/g, ' ');
  
  return {
    title: titleOptions,
    subtitle: subtitleOptions,
    keywordField: keywordFieldOptions,
    reasoning
  };
}

function generateGrowthProjections(
  appData: ParsedAppData, 
  recommendations: MetadataRecommendations
): GrowthProjections {
  // Define timeframes for projections (in months)
  const timeframes = [1, 3, 6, 12];
  
  // Estimate conversion rates based on rank position
  const estimateConversionRate = (rank: number): number => {
    if (rank <= 1) return 0.12;
    if (rank <= 3) return 0.08;
    if (rank <= 5) return 0.05;
    if (rank <= 10) return 0.03;
    if (rank <= 20) return 0.01;
    if (rank <= 50) return 0.005;
    return 0.001;
  };
  
  // Estimate rank improvements over time
  const estimateRankImprovement = (
    currentRank: number,
    difficulty: number,
    months: number
  ): number => {
    // Easier keywords improve faster
    const difficultyFactor = 1 - (difficulty / 200); // 0.5 to 1.0
    
    // Higher initial ranks improve faster in absolute terms
    const rankFactor = Math.min(Math.log10(currentRank + 10) / 2, 1);
    
    // Calculate improvement (more months = more improvement, but with diminishing returns)
    const improvement = rankFactor * difficultyFactor * Math.sqrt(months) * 20;
    
    // Make sure we don't improve beyond rank 1
    return Math.min(currentRank - 1, improvement);
  };
  
  // Project downloads for each timeframe
  const projectedDownloads: number[] = [];
  
  // Project rank improvements for top keywords
  const projectedRankImprovements: { [keyword: string]: number[] } = {};
  
  // Get keywords included in recommendations
  const recommendedKeywords = new Set<string>();
  recommendations.title.forEach(t => {
    t.split(/\s+/).forEach(w => recommendedKeywords.add(w.toLowerCase()));
  });
  recommendations.subtitle.forEach(s => {
    s.split(/\s+/).forEach(w => recommendedKeywords.add(w.toLowerCase()));
  });
  recommendations.keywordField.forEach(k => {
    k.split(/,\s*/).forEach(w => recommendedKeywords.add(w.toLowerCase()));
  });
  
  // Find the keywords that match the recommendations
  const keywordsToProject = appData.keywords.filter(k => 
    Array.from(recommendedKeywords).some(rk => 
      k.keyword.toLowerCase().includes(rk) || 
      rk.includes(k.keyword.toLowerCase())
    )
  );
  
  if (keywordsToProject.length === 0) {
    // Fallback to top keywords by volume
    keywordsToProject.push(...appData.keywords
      .filter(k => k.volume !== undefined)
      .sort((a, b) => (b.volume || 0) - (a.volume || 0))
      .slice(0, 5)
    );
  }
  
  // Calculate projected downloads for each timeframe
  timeframes.forEach((months, index) => {
    let totalDownloads = 0;
    
    keywordsToProject.forEach(keyword => {
      const volume = keyword.volume || 100;
      const difficulty = keyword.difficulty || 50;
      const currentRank = keyword.currentRank || 100;
      
      // Calculate projected rank
      const rankImprovement = estimateRankImprovement(currentRank, difficulty, months);
      const projectedRank = Math.max(1, currentRank - rankImprovement);
      
      // Store rank improvements for display
      if (!projectedRankImprovements[keyword.keyword]) {
        projectedRankImprovements[keyword.keyword] = [];
      }
      projectedRankImprovements[keyword.keyword][index] = projectedRank;
      
      // Calculate downloads based on projected rank and estimated conversion
      const conversionRate = estimateConversionRate(projectedRank);
      const monthlyDownloads = volume * conversionRate * 30; // Assume volume is daily
      
      totalDownloads += monthlyDownloads;
    });
    
    projectedDownloads.push(Math.round(totalDownloads));
  });
  
  return {
    timeframes,
    projectedDownloads,
    projectedRankImprovements
  };
} 