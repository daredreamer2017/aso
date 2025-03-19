'use client';

import React, { useState, useEffect } from 'react';
import { parseCSVData, ParsedAppData } from '@/lib/flexible-csv-parser';
import { analyzeAppData, AIAnalysisResult } from '@/lib/ai-analysis-service';
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
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import ScreenshotAnalysis from '@/components/ScreenshotAnalysis';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [appData, setAppData] = useState<ParsedAppData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'metadata' | 'screenshots'>('summary');
  const [selectedMetadata, setSelectedMetadata] = useState<{
    title: string | null;
    subtitle: string | null;
    keywordField: string | null;
  }>({
    title: null,
    subtitle: null,
    keywordField: null,
  });
  const [dynamicProjections, setDynamicProjections] = useState<{
    downloads: number[];
    rankImprovements: { [keyword: string]: number[] };
  }>({
    downloads: [],
    rankImprovements: {},
  });
  const [projectionsCalculated, setProjectionsCalculated] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Parse CSV data
      const parsedData = await parseCSVData(file);
      setAppData(parsedData);

      // Analyze the parsed data
      const analysis = await analyzeAppData(parsedData);
      setAnalysisResult(analysis);

      // Set initial metadata selections
      if (analysis.recommendations.title.length > 0) {
        setSelectedMetadata({
          title: analysis.recommendations.title[0],
          subtitle: analysis.recommendations.subtitle[0],
          keywordField: analysis.recommendations.keywordField[0],
        });
      }
    } catch (error) {
      console.error("Error processing CSV file:", error);
      setUploadError(error instanceof Error ? error.message : "Failed to process the CSV file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleMetadataSelection = (field: 'title' | 'subtitle' | 'keywordField', value: string) => {
    setSelectedMetadata(prev => ({
      ...prev,
      [field]: value
    }));
    // Reset projections when metadata selections change
    setProjectionsCalculated(false);
  };

  // Calculate projections based on selected metadata
  const calculateProjections = () => {
    if (!appData || !analysisResult || !selectedMetadata.title || !selectedMetadata.subtitle || !selectedMetadata.keywordField) {
      return;
    }
    
    // Set flag first to indicate that calculations have started
    setProjectionsCalculated(true);
    
    // Collect all keywords from the selected metadata
    const allSelectedKeywords = new Set<string>();
    
    // Add keywords from title
    selectedMetadata.title.split(/\s+/)
      .filter(word => word.length > 2 && !['and', 'the', 'for', 'with'].includes(word.toLowerCase()))
      .forEach(word => allSelectedKeywords.add(word.toLowerCase()));
    
    // Add keywords from subtitle
    selectedMetadata.subtitle.split(/\s+/)
      .filter(word => word.length > 2 && !['and', 'the', 'for', 'with'].includes(word.toLowerCase()))
      .forEach(word => allSelectedKeywords.add(word.toLowerCase()));
    
    // Add keywords from keyword field
    selectedMetadata.keywordField.split(/,\s*/)
      .forEach(keyword => allSelectedKeywords.add(keyword.toLowerCase()));
    
    // Find matching keywords in the dataset
    let matchingKeywords = appData.keywords.filter(k => 
      Array.from(allSelectedKeywords).some(selected => 
        k.keyword.toLowerCase().includes(selected) || 
        selected.includes(k.keyword.toLowerCase())
      )
    );
    
    // Log for debugging
    console.log('Selected keywords:', Array.from(allSelectedKeywords));
    console.log('Matching keywords found:', matchingKeywords.length);
    
    if (matchingKeywords.length === 0) {
      // If no exact matches, use keywords with highest volume
      matchingKeywords = appData.keywords
        .filter(k => k.volume !== undefined)
        .sort((a, b) => (b.volume || 0) - (a.volume || 0))
        .slice(0, 5);
      
      console.log('Falling back to top volume keywords:', matchingKeywords.map(k => k.keyword));
    }
    
    // Calculate new projections
    const timeframes = analysisResult.projections.timeframes;
    const downloads: number[] = [];
    const rankImprovements: { [keyword: string]: number[] } = {};
    
    // Determine a boost factor based on having an optimized title, subtitle, and keywords
    // More comprehensive metadata coverage = better boost
    const metadataBoostFactor = 1.2; // 20% boost for optimized metadata
    
    // Calculate projections for each timeframe
    timeframes.forEach((months, index) => {
      let totalDownloads = 0;
      
      matchingKeywords.forEach(keyword => {
        const volume = keyword.volume || 100;
        const difficulty = keyword.difficulty || 50;
        const currentRank = keyword.currentRank || 100;
        
        // Enhanced rank improvement calculation with metadata boost
        const estimateRankImprovement = (
          currentRank: number,
          difficulty: number,
          months: number
        ): number => {
          // Easier keywords improve faster
          const difficultyFactor = 1 - (difficulty / 200); // 0.5 to 1.0
          
          // Higher initial ranks improve faster in absolute terms
          const rankFactor = Math.min(Math.log10(currentRank + 10) / 2, 1);
          
          // Calculate improvement with metadata boost
          const improvement = rankFactor * difficultyFactor * Math.sqrt(months) * 20 * metadataBoostFactor;
          
          // Make sure we don't improve beyond rank 1
          return Math.min(currentRank - 1, improvement);
        };
        
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
        
        const rankImprovement = estimateRankImprovement(currentRank, difficulty, months);
        const projectedRank = Math.max(1, currentRank - rankImprovement);
        
        // Store rank improvements for display
        if (!rankImprovements[keyword.keyword]) {
          rankImprovements[keyword.keyword] = [];
        }
        rankImprovements[keyword.keyword][index] = projectedRank;
        
        // Calculate downloads based on projected rank
        const conversionRate = estimateConversionRate(projectedRank);
        const monthlyDownloads = volume * conversionRate * 30; // Assume volume is daily
        
        totalDownloads += monthlyDownloads;
      });
      
      downloads.push(Math.round(totalDownloads));
    });
    
    // Update state with calculated projections
    setDynamicProjections({
      downloads,
      rankImprovements
    });
    
    // Log results without alert disruption
    console.log(`Projections calculated: Found ${matchingKeywords.length} matching keywords.`);
    console.log(`Estimated additional downloads after 3 months: ${downloads[0].toLocaleString()}`);
  };

  // Render file upload UI if no data is loaded
  if (!appData || !analysisResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">ASO Analytics</h1>
            <p className="text-gray-600">
              Upload your keyword data to get AI-powered insights and recommendations
            </p>
          </div>

          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                id="csv-upload"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
              <label
                htmlFor="csv-upload"
                className={`inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white ${
                  isUploading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
                } cursor-pointer transition-colors`}
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  "Upload CSV File"
                )}
              </label>
              <p className="mt-2 text-sm text-gray-500">
                Upload any CSV file with keyword data
              </p>
            </div>

            {uploadError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{uploadError}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Information</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Your CSV should contain keyword data with columns like keyword, volume, 
                      difficulty, and current rank. Don't worry if you're missing some columns - 
                      our AI will work with whatever data is available.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                ASO Analysis
                {appData.appDetails.appName && ` for ${appData.appDetails.appName}`}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {appData.keywords.length} keywords analyzed • 
                {appData.appDetails.store ? ` ${appData.appDetails.store} • ` : ' '}
                {new Date().toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => {
                setAppData(null);
                setAnalysisResult(null);
              }}
              className="text-gray-600 hover:text-gray-900"
            >
              Upload New Data
            </button>
          </div>
          
          {/* Warning Messages */}
          {analysisResult.missingDataWarnings.length > 0 && (
            <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    {analysisResult.missingDataWarnings[0]}
                    {analysisResult.missingDataWarnings.length > 1 && (
                      <span> +{analysisResult.missingDataWarnings.length - 1} more issues</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Navigation Tabs */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="flex -mb-px space-x-8">
              <button
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'summary'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('summary')}
              >
                Summary
              </button>
              <button
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'metadata'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('metadata')}
              >
                ASO Metadata
              </button>
              <button
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'screenshots'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('screenshots')}
              >
                Screenshot Analysis
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Keyword Insights Tab */}
        {activeTab === 'summary' && (
          <div className="space-y-8">
            {/* Summary */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Summary</h2>
              <p className="text-gray-700">{analysisResult.insights.summary}</p>
            </div>
            
            {/* Keyword Overview */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Keyword Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-indigo-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-indigo-800">Total Keywords</h3>
                  <p className="mt-2 text-2xl font-semibold text-indigo-900">{appData.keywords.length}</p>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-green-800">Avg. Search Volume</h3>
                  <p className="mt-2 text-2xl font-semibold text-green-900">
                    {Math.round(
                      appData.keywords.reduce((sum, k) => sum + (k.volume || 0), 0) / 
                      (appData.keywords.filter(k => k.volume !== undefined).length || 1)
                    ).toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-yellow-800">Avg. Difficulty</h3>
                  <p className="mt-2 text-2xl font-semibold text-yellow-900">
                    {Math.round(
                      appData.keywords.reduce((sum, k) => sum + (k.difficulty || 0), 0) / 
                      (appData.keywords.filter(k => k.difficulty !== undefined).length || 1)
                    )}
                  </p>
                </div>
                
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-red-800">Keywords Ranked</h3>
                  <p className="mt-2 text-2xl font-semibold text-red-900">
                    {appData.keywords.filter(k => k.currentRank !== undefined).length}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Volume vs Difficulty Chart */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Volume vs. Difficulty Analysis
              </h2>
              <div className="h-80">
                <Line
                  data={{
                    datasets: [
                      {
                        label: 'Keywords',
                        data: appData.keywords
                          .filter(k => k.volume !== undefined && k.difficulty !== undefined)
                          .slice(0, 30) // Limit to prevent crowding
                          .map(k => ({
                            x: k.difficulty,
                            y: k.volume,
                            keyword: k.keyword,
                            currentRank: k.currentRank
                          })),
                        backgroundColor: 'rgba(99, 102, 241, 0.7)',
                        borderColor: 'transparent',
                        pointRadius: 8,
                        pointHoverRadius: 10,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    scales: {
                      x: {
                        type: 'linear' as const,
                        position: 'bottom' as const,
                        title: {
                          display: true,
                          text: 'Difficulty (Lower is Better)'
                        },
                        min: 0,
                        max: 100
                      },
                      y: {
                        type: 'linear' as const,
                        title: {
                          display: true,
                          text: 'Search Volume'
                        },
                        beginAtZero: true
                      }
                    },
                    plugins: {
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const data = context.raw as any;
                            let label = data.keyword || '';
                            label += ` (Volume: ${(data.y as number).toLocaleString()}, Difficulty: ${data.x})`;
                            if (data.currentRank) {
                              label += `, Current Rank: #${data.currentRank}`;
                            }
                            return label;
                          }
                        }
                      },
                      legend: {
                        display: false
                      }
                    }
                  }}
                />
              </div>
              <div className="mt-4 text-sm text-gray-500">
                <p>This chart plots keywords based on their search volume and difficulty. Ideal keywords have high volume (higher on the Y-axis) and low difficulty (towards the left on the X-axis).</p>
              </div>
            </div>
            
            {/* Top Opportunities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Low Competition Opportunities
                </h2>
                <div className="space-y-4">
                  {analysisResult.insights.lowCompetitionOpportunities.length > 0 ? (
                    analysisResult.insights.lowCompetitionOpportunities.map((keyword, index) => (
                      <div key={index} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-gray-900">{keyword.keyword}</h3>
                          <span className="text-green-600 text-sm font-medium">
                            High Opportunity
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Volume</span>
                            <p className="font-medium">{keyword.volume?.toLocaleString() || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Difficulty</span>
                            <p className="font-medium">{keyword.difficulty || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Current Rank</span>
                            <p className="font-medium">
                              {keyword.currentRank ? `#${keyword.currentRank}` : 'Not ranked'}
                            </p>
                          </div>
                        </div>
                        {/* Opportunity Score Visualization */}
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 rounded-full h-2"
                              style={{ 
                                width: `${Math.min(100, 
                                  ((keyword.volume || 0) / 
                                  (((keyword.difficulty || 50) / 50) * 100)) * 0.05
                                )}%` 
                              }}
                            />
                          </div>
                          <div className="mt-1 flex justify-between text-xs text-gray-500">
                            <span>Opportunity Score</span>
                            <span>
                              {Math.round(
                                (keyword.volume || 0) / 
                                (((keyword.difficulty || 50) / 50) * 100) * 10
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">No low-competition opportunities found.</p>
                  )}
                </div>
              </div>
              
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Underperforming Keywords
                </h2>
                <div className="space-y-4">
                  {analysisResult.insights.underperformingKeywords.length > 0 ? (
                    analysisResult.insights.underperformingKeywords.map((keyword, index) => (
                      <div key={index} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-gray-900">{keyword.keyword}</h3>
                          <span className="text-yellow-600 text-sm font-medium">
                            Needs Improvement
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Volume</span>
                            <p className="font-medium">{keyword.volume?.toLocaleString() || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Difficulty</span>
                            <p className="font-medium">{keyword.difficulty || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Current Rank</span>
                            <p className="font-medium">
                              {keyword.currentRank ? `#${keyword.currentRank}` : 'Not ranked'}
                            </p>
                          </div>
                        </div>
                        {/* Potential Improvement Visualization */}
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Current Rank</span>
                            <span>Target Rank</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 relative">
                            <div
                              className="bg-yellow-500 rounded-full h-2 absolute right-0"
                              style={{ 
                                width: `${Math.min(100, 
                                  ((keyword.currentRank || 100) / 100) * 100
                                )}%` 
                              }}
                            />
                            <div
                              className="bg-green-500 rounded-full h-2 absolute right-0"
                              style={{ 
                                width: `${Math.min(100, 
                                  (Math.max(1, (keyword.currentRank || 100) / 2) / 100) * 100
                                )}%` 
                              }}
                            />
                          </div>
                          <div className="mt-1 flex justify-between text-xs">
                            <span className="text-green-600">#{Math.max(1, Math.floor((keyword.currentRank || 100) / 2))}</span>
                            <span className="text-yellow-600">#{keyword.currentRank || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">No underperforming keywords found.</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Keyword Categories */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Keyword Categories
              </h2>
              <div className="space-y-6">
                {Object.entries(analysisResult.insights.keywordCategories).length > 0 ? (
                  Object.entries(analysisResult.insights.keywordCategories)
                    .filter(([category]) => category !== 'other')
                    .map(([category, keywords]) => (
                      <div key={category} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-medium text-gray-900 capitalize">{category}</h3>
                          <span className="text-xs text-gray-500">{keywords.length} keywords</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {keywords.map((keyword, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {keyword.keyword}
                              {keyword.volume && (
                                <span className="ml-1 text-gray-500">({keyword.volume})</span>
                              )}
                            </span>
                          ))}
                        </div>
                        {/* Category Stats */}
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-xs">
                            <span className="text-gray-500">Avg. Volume</span>
                            <p className="text-sm font-medium text-gray-900">
                              {Math.round(
                                keywords.reduce((sum, k) => sum + (k.volume || 0), 0) / 
                                (keywords.filter(k => k.volume !== undefined).length || 1)
                              ).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-500">Avg. Difficulty</span>
                            <p className="text-sm font-medium text-gray-900">
                              {Math.round(
                                keywords.reduce((sum, k) => sum + (k.difficulty || 0), 0) / 
                                (keywords.filter(k => k.difficulty !== undefined).length || 1)
                              )}
                            </p>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-500">Best Rank</span>
                            <p className="text-sm font-medium text-gray-900">
                              {keywords.some(k => k.currentRank !== undefined)
                                ? `#${Math.min(...keywords.filter(k => k.currentRank !== undefined).map(k => k.currentRank!))}`
                                : 'N/A'}
                            </p>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-500">Total Potential</span>
                            <p className="text-sm font-medium text-gray-900">
                              {keywords.reduce((sum, k) => sum + (k.volume || 0), 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-gray-500 italic">No keyword categories could be identified.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Metadata & ASO Tab */}
        {activeTab === 'metadata' && (
          <div className="space-y-8">
            {/* Introduction */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                AI-Generated Metadata Recommendations
              </h2>
              <p className="text-gray-700 mb-4">
                Select the best options for each metadata field. These recommendations are based on
                your keyword data and optimized for maximum visibility in the app stores.
              </p>
              <p className="text-gray-700">
                {analysisResult.recommendations.reasoning}
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-8">
                {/* Title Options */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    App Title Recommendations
                  </h2>
                  <div className="space-y-4">
                    {analysisResult.recommendations.title.map((title, index) => (
                      <div 
                        key={index} 
                        className={`border rounded-lg p-4 ${
                          selectedMetadata.title === title 
                            ? 'border-indigo-500 bg-indigo-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        } cursor-pointer transition-colors`}
                        onClick={() => handleMetadataSelection('title', title)}
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-gray-900">{title}</h3>
                          {selectedMetadata.title === title && (
                            <span className="text-indigo-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          Option {index + 1}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Subtitle Options */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Subtitle Recommendations
                  </h2>
                  <div className="space-y-4">
                    {analysisResult.recommendations.subtitle.map((subtitle, index) => (
                      <div 
                        key={index} 
                        className={`border rounded-lg p-4 ${
                          selectedMetadata.subtitle === subtitle 
                            ? 'border-indigo-500 bg-indigo-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        } cursor-pointer transition-colors`}
                        onClick={() => handleMetadataSelection('subtitle', subtitle)}
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-gray-900">{subtitle}</h3>
                          {selectedMetadata.subtitle === subtitle && (
                            <span className="text-indigo-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          Option {index + 1}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
                
              <div className="space-y-8">
                {/* Keyword Field Options */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Keyword Field Recommendations
                  </h2>
                  <div className="space-y-4">
                    {analysisResult.recommendations.keywordField.map((keywordField, index) => (
                      <div 
                        key={index} 
                        className={`border rounded-lg p-4 ${
                          selectedMetadata.keywordField === keywordField 
                            ? 'border-indigo-500 bg-indigo-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        } cursor-pointer transition-colors`}
                        onClick={() => handleMetadataSelection('keywordField', keywordField)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1 mr-4">
                            <h3 className="font-medium text-gray-900">Keyword Set {index + 1}</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {keywordField.split(/,\s*/).map((kw, i) => (
                                <span 
                                  key={i}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                          {selectedMetadata.keywordField === keywordField && (
                            <span className="text-indigo-600 flex-shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Selected Metadata Summary */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Your Selected Metadata
                  </h2>
                  
                  {(!selectedMetadata.title || !selectedMetadata.subtitle || !selectedMetadata.keywordField) ? (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            Please select recommendations for all metadata fields to see growth projections.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="border-b pb-2">
                        <span className="text-sm text-gray-500">App Title:</span>
                        <p className="font-medium text-gray-900">{selectedMetadata.title}</p>
                      </div>
                      <div className="border-b pb-2">
                        <span className="text-sm text-gray-500">Subtitle:</span>
                        <p className="font-medium text-gray-900">{selectedMetadata.subtitle}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Keywords:</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {selectedMetadata.keywordField?.split(/,\s*/).map((kw, i) => (
                            <span 
                              key={i}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            calculateProjections();
                          }}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                          </svg>
                          Calculate Projections
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Projections Section */}
            {projectionsCalculated && (
              <div id="projection-result" className="mt-6 bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-200 overflow-hidden rounded-lg">
                <div className="p-6">
                  <div className="space-y-8">
                    <h3 className="text-lg font-medium text-indigo-900 flex items-center mb-6">
                      <svg className="mr-2 h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Growth Projections Based on Selected Metadata
                    </h3>
                    
                    {dynamicProjections.downloads.length > 0 ? (
                      <div className="space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <div className="text-sm text-gray-500">3 Month Installs</div>
                            <div className="text-2xl font-bold text-indigo-600">+{dynamicProjections.downloads[0].toLocaleString()}</div>
                          </div>
                          {dynamicProjections.downloads.length > 1 && (
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                              <div className="text-sm text-gray-500">6 Month Installs</div>
                              <div className="text-2xl font-bold text-indigo-600">+{dynamicProjections.downloads[1].toLocaleString()}</div>
                            </div>
                          )}
                          {dynamicProjections.downloads.length > 2 && (
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                              <div className="text-sm text-gray-500">12 Month Installs</div>
                              <div className="text-2xl font-bold text-indigo-600">+{dynamicProjections.downloads[2].toLocaleString()}</div>
                            </div>
                          )}
                        </div>

                        {/* Charts section */}
                        <div className="space-y-8">
                          {/* Install Growth Chart */}
                          <div className="bg-white p-6 rounded-lg shadow-sm">
                            <h4 className="text-base font-medium text-gray-800 mb-4">Projected Install Growth Over Time</h4>
                            <div className="h-80">
                              <Bar 
                                data={{
                                  labels: analysisResult.projections.timeframes.map(t => `${t} ${t === 1 ? 'Month' : 'Months'}`),
                                  datasets: [{
                                    label: 'Additional Installs',
                                    data: dynamicProjections.downloads,
                                    backgroundColor: 'rgba(99, 102, 241, 0.6)',
                                    borderColor: 'rgb(99, 102, 241)',
                                    borderWidth: 1
                                  }]
                                }}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                      callbacks: {
                                        label: function(context) {
                                          const value = context.raw as number;
                                          return `Additional: ${value.toLocaleString()} installs`;
                                        }
                                      }
                                    }
                                  },
                                  scales: {
                                    y: {
                                      beginAtZero: true,
                                      title: {
                                        display: true,
                                        text: 'Additional Installs'
                                      },
                                      ticks: {
                                        callback: function(value) {
                                          return Number(value).toLocaleString();
                                        }
                                      }
                                    }
                                  }
                                }}
                              />
                            </div>
                          </div>

                          {/* Side-by-side charts */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Rank Improvement Chart */}
                            <div className="bg-white p-6 rounded-lg shadow-sm">
                              <h4 className="text-base font-medium text-gray-800 mb-4">Keyword Rank Improvements</h4>
                              <div className="h-80">
                                <Line 
                                  data={{
                                    labels: analysisResult.projections.timeframes.map(t => `${t} ${t === 1 ? 'Month' : 'Months'}`),
                                    datasets: Object.entries(dynamicProjections.rankImprovements)
                                      .slice(0, 5)
                                      .map(([keyword, ranks], index) => ({
                                        label: keyword,
                                        data: ranks,
                                        borderColor: [
                                          'rgba(99, 102, 241, 1)',
                                          'rgba(16, 185, 129, 1)',
                                          'rgba(245, 158, 11, 1)',
                                          'rgba(239, 68, 68, 1)',
                                          'rgba(139, 92, 246, 1)'
                                        ][index % 5],
                                        backgroundColor: 'transparent',
                                        tension: 0.4
                                      }))
                                  }}
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                      tooltip: {
                                        callbacks: {
                                          label: function(context) {
                                            return `${context.dataset.label}: Rank #${Math.round(context.raw as number)}`;
                                          }
                                        }
                                      }
                                    },
                                    scales: {
                                      y: {
                                        reverse: true,
                                        title: {
                                          display: true,
                                          text: 'Rank Position'
                                        },
                                        min: 1,
                                        max: 100
                                      }
                                    }
                                  }}
                                />
                              </div>
                            </div>

                            {/* Correlation Chart */}
                            <div className="bg-white p-6 rounded-lg shadow-sm">
                              <h4 className="text-base font-medium text-gray-800 mb-4">Rank-to-Install Correlation</h4>
                              <div className="h-80">
                                <Line 
                                  data={{
                                    labels: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1],
                                    datasets: [{
                                      label: 'Estimated Monthly Installs',
                                      data: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1].map(rank => {
                                        const estimateConversionRate = (r: number): number => {
                                          if (r <= 1) return 0.12;
                                          if (r <= 3) return 0.08;
                                          if (r <= 5) return 0.05;
                                          if (r <= 10) return 0.03;
                                          if (r <= 20) return 0.01;
                                          if (r <= 50) return 0.005;
                                          return 0.001;
                                        };
                                        
                                        const avgVolume = Math.round(
                                          appData.keywords
                                            .filter(k => k.volume !== undefined)
                                            .sort((a, b) => (b.volume || 0) - (a.volume || 0))
                                            .slice(0, 10)
                                            .reduce((sum, k) => sum + (k.volume || 0), 0) / 10
                                        );
                                        
                                        return avgVolume * estimateConversionRate(rank) * 30;
                                      }),
                                      borderColor: 'rgba(16, 185, 129, 1)',
                                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                      tension: 0.4,
                                      fill: true
                                    }]
                                  }}
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                      tooltip: {
                                        callbacks: {
                                          label: function(context) {
                                            const value = context.raw as number;
                                            return `At Rank #${context.label}: ${Math.round(value).toLocaleString()} installs/month`;
                                          }
                                        }
                                      }
                                    },
                                    scales: {
                                      x: {
                                        reverse: true,
                                        title: {
                                          display: true,
                                          text: 'Rank Position'
                                        }
                                      },
                                      y: {
                                        beginAtZero: true,
                                        title: {
                                          display: true,
                                          text: 'Estimated Monthly Installs'
                                        },
                                        ticks: {
                                          callback: function(value) {
                                            return Number(value).toLocaleString();
                                          }
                                        }
                                      }
                                    }
                                  }}
                                />
                              </div>
                              <p className="mt-4 text-sm text-gray-500">
                                This chart shows the correlation between keyword ranking position and estimated monthly installs.
                                The higher your keyword ranks, the more installs you can expect.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Keywords table */}
                        {Object.keys(dynamicProjections.rankImprovements).length > 0 && (
                          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                            <h4 className="text-base font-medium text-gray-800 p-4 border-b">Top Keywords with Projected Rank Improvements</h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keyword</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Rank</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">3 Month Rank</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">6 Month Rank</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Monthly Impact</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {Object.entries(dynamicProjections.rankImprovements)
                                    .slice(0, 10)
                                    .map(([keyword, ranks], i) => {
                                      const keywordData = appData.keywords.find(k => k.keyword === keyword);
                                      const currentRank = keywordData?.currentRank || 100;
                                      const volume = keywordData?.volume || 100;
                                      const difficulty = keywordData?.difficulty || 50;
                                      
                                      const estimateConversionRate = (rank: number): number => {
                                        if (rank <= 1) return 0.12;
                                        if (rank <= 3) return 0.08;
                                        if (rank <= 5) return 0.05;
                                        if (rank <= 10) return 0.03;
                                        if (rank <= 20) return 0.01;
                                        if (rank <= 50) return 0.005;
                                        return 0.001;
                                      };
                                      
                                      const currentInstalls = volume * estimateConversionRate(currentRank) * 30;
                                      const projectedInstalls = volume * estimateConversionRate(Math.round(ranks[0])) * 30;
                                      const impact = Math.round(projectedInstalls - currentInstalls);
                                      
                                      const rankImprovement = currentRank - Math.round(ranks[0]);
                                      const improvementPercent = Math.round((rankImprovement / currentRank) * 100);
                                      
                                      return (
                                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{keyword}</td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{volume.toLocaleString()}</td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{difficulty}</td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">#{currentRank}</td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                                            <div className="flex items-center">
                                              <span className="text-green-600 font-medium">#{Math.round(ranks[0])}</span>
                                              {rankImprovement > 0 && (
                                                <span className="ml-2 text-xs text-green-600 flex items-center">
                                                  <svg className="h-4 w-4 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                  </svg>
                                                  {improvementPercent}%
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-medium">
                                            {ranks.length > 1 ? `#${Math.round(ranks[1])}` : '-'}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center">
                                              <span className="text-sm text-indigo-600 font-medium">+{impact.toLocaleString()}</span>
                                              <div className="ml-2 w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div 
                                                  className="h-full bg-indigo-500 rounded-full" 
                                                  style={{ width: `${Math.min(100, (impact / (volume * 0.1 * 30)) * 100)}%` }}
                                                />
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-indigo-800">
                        <p>No projection data available. This may be due to missing keyword data or insufficient matches.</p>
                      </div>
                    )}

                    <div className="bg-indigo-100 px-4 py-3 mt-6">
                      <p className="text-xs text-indigo-800">
                        These projections are based on your selected metadata and estimated keyword ranking improvements.
                        Actual results may vary based on market conditions and competition.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'screenshots' && <ScreenshotAnalysis />}
      </main>
    </div>
  );
} 