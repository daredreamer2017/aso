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
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-block">
            <div className="w-24 h-24 bg-indigo-600 rounded-2xl shadow-xl flex items-center justify-center mb-6 mx-auto transform rotate-12 relative">
              <div className="w-20 h-20 bg-indigo-500 rounded-xl absolute animate-pulse"></div>
              <svg className="w-12 h-12 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">ASO Dashboard</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Upload your keyword data to get comprehensive ASO analysis and recommendations for improving your app's visibility and installs.
          </p>
        </div>

        {/* Upload Card */}
        <div className="max-w-md w-full">
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-gray-700/50">
            <div className="space-y-6">
              <div 
                className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-indigo-500 transition-all duration-300 cursor-pointer group relative overflow-hidden"
                style={{ background: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.05) 0%, transparent 70%)' }}
              >
                <div className="relative z-10">
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
                    className="flex flex-col items-center cursor-pointer"
                  >
                    <div className="w-16 h-16 bg-indigo-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-900/50 transition-colors">
                      <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <span className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                      isUploading 
                        ? "bg-gray-700 text-gray-300" 
                        : "bg-indigo-600 text-white hover:bg-indigo-500"
                    }`}>
                      {isUploading ? (
                        <div className="flex items-center space-x-2">
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Processing...</span>
                        </div>
                      ) : (
                        "Upload CSV File"
                      )}
                    </span>
                    <p className="mt-4 text-sm text-gray-400">
                      Drop your CSV file here or click to browse
                    </p>
                  </label>
                </div>
              </div>

              {uploadError && (
                <div className="bg-red-900/20 backdrop-blur-sm border border-red-500/50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-red-400">Upload Error</h3>
                      <p className="mt-1 text-sm text-red-300">{uploadError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="w-10 h-10 bg-indigo-900/30 rounded-lg flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-white mb-1">Keyword Analysis</h3>
                  <p className="text-xs text-gray-400">Track performance metrics and identify opportunities</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="w-10 h-10 bg-indigo-900/30 rounded-lg flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-white mb-1">Ranking Predictions</h3>
                  <p className="text-xs text-gray-400">Get insights on potential ranking improvements</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Dashboard Header */}
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-900/30 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center">
                  ASO Analysis
                  {appData.appDetails.appName && (
                    <>
                      <span className="mx-2 text-gray-600">•</span>
                      <span className="text-indigo-400">{appData.appDetails.appName}</span>
                    </>
                  )}
                </h1>
                <p className="mt-1 text-sm text-gray-400 flex items-center space-x-3">
                  <span>{appData.keywords.length} keywords analyzed</span>
                  {appData.appDetails.store && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span>{appData.appDetails.store}</span>
                    </>
                  )}
                  <span className="text-gray-600">•</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setAppData(null);
                setAnalysisResult(null);
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all duration-200"
            >
              Upload New Data
            </button>
          </div>
          
          {/* Navigation Tabs */}
          <div className="mt-6 border-b border-gray-700/50">
            <nav className="flex -mb-px space-x-8">
              {['summary', 'metadata', 'screenshots'].map((tab) => (
                <button
                  key={tab}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                    activeTab === tab
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                  }`}
                  onClick={() => setActiveTab(tab as any)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="space-y-8">
            {/* Summary */}
            <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700">
              <h2 className="text-lg font-medium text-white mb-4">Summary</h2>
              <p className="text-gray-300">{analysisResult.insights.summary}</p>
            </div>
            
            {/* Keyword Overview */}
            <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700">
              <h2 className="text-lg font-medium text-white mb-4">Keyword Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <h3 className="text-sm font-medium text-gray-300">Total Keywords</h3>
                  <p className="mt-2 text-2xl font-semibold text-white">{appData.keywords.length}</p>
                </div>
                
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <h3 className="text-sm font-medium text-gray-300">Avg. Search Volume</h3>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {Math.round(
                      appData.keywords.reduce((sum, k) => sum + (k.volume || 0), 0) / 
                      (appData.keywords.filter(k => k.volume !== undefined).length || 1)
                    ).toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <h3 className="text-sm font-medium text-gray-300">Avg. Difficulty</h3>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {Math.round(
                      appData.keywords.reduce((sum, k) => sum + (k.difficulty || 0), 0) / 
                      (appData.keywords.filter(k => k.difficulty !== undefined).length || 1)
                    )}
                  </p>
                </div>
                
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <h3 className="text-sm font-medium text-gray-300">Keywords Ranked</h3>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {appData.keywords.filter(k => k.currentRank !== undefined).length}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Volume vs Difficulty Chart */}
            <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700">
              <h2 className="text-lg font-medium text-white mb-4">
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
                          .slice(0, 30)
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
                          text: 'Difficulty (Lower is Better)',
                          color: '#9CA3AF'
                        },
                        min: 0,
                        max: 100,
                        grid: {
                          color: 'rgba(75, 85, 99, 0.2)'
                        },
                        ticks: {
                          color: '#9CA3AF'
                        }
                      },
                      y: {
                        type: 'linear' as const,
                        title: {
                          display: true,
                          text: 'Search Volume',
                          color: '#9CA3AF'
                        },
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(75, 85, 99, 0.2)'
                        },
                        ticks: {
                          color: '#9CA3AF'
                        }
                      }
                    },
                    plugins: {
                      tooltip: {
                        backgroundColor: 'rgba(31, 41, 55, 0.9)',
                        titleColor: '#E5E7EB',
                        bodyColor: '#D1D5DB',
                        borderColor: '#4B5563',
                        borderWidth: 1,
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
              </div>
            </div>
        )}

        {/* Metadata & ASO Tab */}
        {activeTab === 'metadata' && (
          <div className="space-y-8">
            {/* AI-Generated Metadata Recommendations */}
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-2">AI-Generated Metadata Recommendations</h2>
                <p className="text-gray-400">
                  Select the best options for each metadata field. These recommendations are based on your keyword data and optimized for maximum visibility in the app stores.
                </p>
                <p className="mt-4 text-gray-400">
                  {analysisResult?.recommendations.reasoning}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* App Title Recommendations */}
                <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-medium text-white mb-4">App Title Recommendations</h3>
                  <div className="space-y-3">
                    {analysisResult?.recommendations.title.map((title, index) => (
                      <div
                        key={index}
                        onClick={() => handleMetadataSelection('title', title)}
                        className={`cursor-pointer rounded-lg p-4 transition-colors ${
                          selectedMetadata.title === title
                            ? 'bg-indigo-900/50 border border-indigo-500'
                            : 'bg-gray-900/50 border border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{title}</p>
                            <p className="text-sm text-gray-400">Option {index + 1}</p>
                          </div>
                          {selectedMetadata.title === title && (
                            <span className="text-indigo-400">
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

                {/* Keyword Field Recommendations */}
                <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-medium text-white mb-4">Keyword Field Recommendations</h3>
                  <div className="space-y-3">
                    {analysisResult?.recommendations.keywordField.map((keywordField, index) => (
                      <div
                        key={index}
                        onClick={() => handleMetadataSelection('keywordField', keywordField)}
                        className={`cursor-pointer rounded-lg p-4 transition-colors ${
                          selectedMetadata.keywordField === keywordField
                            ? 'bg-indigo-900/50 border border-indigo-500'
                            : 'bg-gray-900/50 border border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm text-gray-400 mb-2">Set {index + 1}</p>
                            <div className="flex flex-wrap gap-2">
                              {keywordField.split(/,\s*/).map((kw, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-900/50 text-indigo-300"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                          {selectedMetadata.keywordField === keywordField && (
                            <span className="text-indigo-400 flex-shrink-0 ml-4">
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
              </div>

              {/* Subtitle Recommendations */}
              <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700">
                <h3 className="text-lg font-medium text-white mb-4">Subtitle Recommendations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analysisResult?.recommendations.subtitle.map((subtitle, index) => (
                    <div
                      key={index}
                      onClick={() => handleMetadataSelection('subtitle', subtitle)}
                      className={`cursor-pointer rounded-lg p-4 transition-colors ${
                        selectedMetadata.subtitle === subtitle
                          ? 'bg-indigo-900/50 border border-indigo-500'
                          : 'bg-gray-900/50 border border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white font-medium">{subtitle}</p>
                          <p className="text-sm text-gray-400 mt-1">Option {index + 1}</p>
                        </div>
                        {selectedMetadata.subtitle === subtitle && (
                          <span className="text-indigo-400">
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
              <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700">
                <h2 className="text-lg font-medium text-white mb-4">
                  Your Selected Metadata
                </h2>
                
                {(!selectedMetadata.title || !selectedMetadata.subtitle || !selectedMetadata.keywordField) ? (
                  <div className="bg-yellow-900/20 border-l-4 border-yellow-500 p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-sm text-yellow-300">
                        Please select recommendations for all metadata fields to see growth projections.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-b border-gray-700 pb-2">
                      <span className="text-sm text-gray-400">App Title:</span>
                      <p className="font-medium text-white">{selectedMetadata.title}</p>
                    </div>
                    <div className="border-b border-gray-700 pb-2">
                      <span className="text-sm text-gray-400">Subtitle:</span>
                      <p className="font-medium text-white">{selectedMetadata.subtitle}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">Keywords:</span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {selectedMetadata.keywordField?.split(/,\s*/).map((kw, i) => (
                          <span 
                            key={i}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-900/50 text-indigo-300"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-6">
                      <button
                        onClick={calculateProjections}
                        className="w-full flex items-center justify-center px-6 py-3 rounded-lg text-white font-medium bg-indigo-600 hover:bg-indigo-700 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Calculate Projections
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Screenshot Analysis Tab */}
        {activeTab === 'screenshots' && <ScreenshotAnalysis />}

        {/* Projection Results */}
        {projectionsCalculated && (
          <div id="projection-result" className="mt-6 -mx-6 bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 overflow-hidden">
            <div className="p-6">
              <div className="space-y-8">
                <h3 className="text-lg font-medium text-white flex items-center mb-6">
                  <svg className="mr-2 h-6 w-6 text-indigo-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Growth Projections Based on Selected Metadata
                </h3>
                
                {dynamicProjections.downloads.length > 0 ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-700">
                        <div className="text-sm text-gray-400">3 Month Installs</div>
                        <div className="text-2xl font-bold text-indigo-400">+{dynamicProjections.downloads[0].toLocaleString()}</div>
                      </div>
                      {dynamicProjections.downloads.length > 1 && (
                        <div className="bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-700">
                          <div className="text-sm text-gray-400">6 Month Installs</div>
                          <div className="text-2xl font-bold text-indigo-400">+{dynamicProjections.downloads[1].toLocaleString()}</div>
                        </div>
                      )}
                      {dynamicProjections.downloads.length > 2 && (
                        <div className="bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-700">
                          <div className="text-sm text-gray-400">12 Month Installs</div>
                          <div className="text-2xl font-bold text-indigo-400">+{dynamicProjections.downloads[2].toLocaleString()}</div>
                        </div>
                      )}
                    </div>

                    {/* Charts section */}
                    <div className="space-y-8">
                      {/* Install Growth Chart */}
                      <div className="bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-700">
                        <h4 className="text-base font-medium text-white mb-4">Projected Install Growth Over Time</h4>
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
                                  backgroundColor: 'rgba(31, 41, 55, 0.9)',
                                  titleColor: '#E5E7EB',
                                  bodyColor: '#D1D5DB',
                                  borderColor: '#4B5563',
                                  borderWidth: 1,
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
                                    text: 'Additional Installs',
                                    color: '#9CA3AF'
                                  },
                                  grid: {
                                    color: 'rgba(75, 85, 99, 0.2)'
                                  },
                                  ticks: {
                                    color: '#9CA3AF',
                                    callback: function(value) {
                                      return Number(value).toLocaleString();
                                    }
                                  }
                                },
                                x: {
                                  grid: {
                                    color: 'rgba(75, 85, 99, 0.2)'
                                  },
                                  ticks: {
                                    color: '#9CA3AF'
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
                        <div className="bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-700">
                          <h4 className="text-base font-medium text-white mb-4">Keyword Rank Improvements</h4>
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
                                    backgroundColor: 'rgba(31, 41, 55, 0.9)',
                                    titleColor: '#E5E7EB',
                                    bodyColor: '#D1D5DB',
                                    borderColor: '#4B5563',
                                    borderWidth: 1,
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
                                      text: 'Rank Position',
                                      color: '#9CA3AF'
                                    },
                                    min: 1,
                                    max: 100,
                                    grid: {
                                      color: 'rgba(75, 85, 99, 0.2)'
                                    },
                                    ticks: {
                                      color: '#9CA3AF'
                                    }
                                  },
                                  x: {
                                    grid: {
                                      color: 'rgba(75, 85, 99, 0.2)'
                                    },
                                    ticks: {
                                      color: '#9CA3AF'
                                    }
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>

                        {/* Correlation Chart */}
                        <div className="bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-700">
                          <h4 className="text-base font-medium text-white mb-4">Rank-to-Install Correlation</h4>
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
                                    backgroundColor: 'rgba(31, 41, 55, 0.9)',
                                    titleColor: '#E5E7EB',
                                    bodyColor: '#D1D5DB',
                                    borderColor: '#4B5563',
                                    borderWidth: 1,
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
                                      text: 'Rank Position',
                                      color: '#9CA3AF'
                                    },
                                    grid: {
                                      color: 'rgba(75, 85, 99, 0.2)'
                                    },
                                    ticks: {
                                      color: '#9CA3AF'
                                    }
                                  },
                                  y: {
                                    beginAtZero: true,
                                    title: {
                                      display: true,
                                      text: 'Estimated Monthly Installs',
                                      color: '#9CA3AF'
                                    },
                                    grid: {
                                      color: 'rgba(75, 85, 99, 0.2)'
                                    },
                                    ticks: {
                                      color: '#9CA3AF',
                                      callback: function(value) {
                                        return Number(value).toLocaleString();
                                      }
                                    }
                                  }
                                }
                              }}
                            />
                          </div>
                          <p className="mt-4 text-sm text-gray-400">
                            This chart shows the correlation between keyword ranking position and estimated monthly installs.
                            The higher your keyword ranks, the more installs you can expect.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Keywords table */}
                    {Object.keys(dynamicProjections.rankImprovements).length > 0 && (
                      <div className="bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-700">
                        <h4 className="text-base font-medium text-white p-4 border-b border-gray-700">Top Keywords with Projected Rank Improvements</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-700/50">
                              <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Keyword</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Volume</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Difficulty</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Current Rank</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">3 Month Rank</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">6 Month Rank</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Est. Monthly Impact</th>
                              </tr>
                            </thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">
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
                                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700/50'}>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">{keyword}</td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{volume.toLocaleString()}</td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{difficulty}</td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">#{currentRank}</td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        <div className="flex items-center">
                                          <span className="text-green-400 font-medium">#{Math.round(ranks[0])}</span>
                                          {rankImprovement > 0 && (
                                            <span className="ml-2 text-xs text-green-400 flex items-center">
                                              <svg className="h-4 w-4 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                              </svg>
                                              {improvementPercent}%
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-green-400 font-medium">
                                        {ranks.length > 1 ? `#${Math.round(ranks[1])}` : '-'}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <span className="text-sm text-indigo-400 font-medium">+{impact.toLocaleString()}</span>
                                          <div className="ml-2 w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
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
                  <div className="mt-2 text-sm text-indigo-400">
                    <p>No projection data available. This may be due to missing keyword data or insufficient matches.</p>
                  </div>
                )}

                <div className="bg-indigo-900/20 px-4 py-3 mt-6 rounded-lg border border-indigo-800">
                  <p className="text-xs text-indigo-300">
                    These projections are based on your selected metadata and estimated keyword ranking improvements.
                    Actual results may vary based on market conditions and competition.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 