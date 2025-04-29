import React, { useState, useRef } from 'react';
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
import { Bar } from 'react-chartjs-2';
import Image from 'next/image';

// Register Chart.js components
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

interface ScreenshotAnalysisProps {
  // Props here
}

const ScreenshotAnalysis: React.FC<ScreenshotAnalysisProps> = () => {
  const [currentConversionRate, setCurrentConversionRate] = useState<string>('');
  const [existingScreenshots, setExistingScreenshots] = useState<File[]>([]);
  const [newScreenshots, setNewScreenshots] = useState<File[]>([]);
  const [existingPreviewUrls, setExistingPreviewUrls] = useState<string[]>([]);
  const [newPreviewUrls, setNewPreviewUrls] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<{
    improvement: number;
    breakdown: {
      layout: number;
      clarity: number;
      branding: number;
      features: number;
      userExperience: number;
    };
    recommendations: string[];
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const existingFileInputRef = useRef<HTMLInputElement>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  const handleConversionRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    if (value === '' || Number(value) <= 100) {
      setCurrentConversionRate(value);
    }
  };

  const handleExistingScreenshots = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setExistingScreenshots(Array.from(e.target.files).slice(0, 10));
    }
  };

  const handleNewScreenshots = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewScreenshots(Array.from(e.target.files).slice(0, 10));
    }
  };

  const handleExistingScreenshotsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    if (existingScreenshots.length + newFiles.length > 10) {
      alert('You can only upload up to 10 existing screenshots');
      return;
    }

    setExistingScreenshots(prev => [...prev, ...newFiles]);
    
    // Create preview URLs
    const newUrls = newFiles.map(file => URL.createObjectURL(file));
    setExistingPreviewUrls(prev => [...prev, ...newUrls]);
  };

  const handleNewScreenshotsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    if (newScreenshots.length + newFiles.length > 10) {
      alert('You can only upload up to 10 new screenshots');
      return;
    }

    setNewScreenshots(prev => [...prev, ...newFiles]);
    
    // Create preview URLs
    const newUrls = newFiles.map(file => URL.createObjectURL(file));
    setNewPreviewUrls(prev => [...prev, ...newUrls]);
  };

  const removeExistingScreenshot = (index: number) => {
    // Revoke URL to prevent memory leaks
    URL.revokeObjectURL(existingPreviewUrls[index]);
    
    setExistingScreenshots(prev => prev.filter((_, i) => i !== index));
    setExistingPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewScreenshot = (index: number) => {
    // Revoke URL to prevent memory leaks
    URL.revokeObjectURL(newPreviewUrls[index]);
    
    setNewScreenshots(prev => prev.filter((_, i) => i !== index));
    setNewPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeScreenshots = async () => {
    if (existingScreenshots.length === 0 || newScreenshots.length === 0 || currentConversionRate === '') {
      alert('Please upload both existing and new screenshots and enter your current conversion rate');
      return;
    }

    setIsAnalyzing(true);

    // Simulate API call with timeout
    try {
      // Simulate an analysis - in a real app, this would be done by the backend
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const improvementPercent = Math.min(Math.floor(Math.random() * 30) + 10, 100 - Number(currentConversionRate));
      
      setAnalysis({
        improvement: improvementPercent,
        breakdown: {
          layout: Math.floor(Math.random() * 100),
          clarity: Math.floor(Math.random() * 100),
          branding: Math.floor(Math.random() * 100),
          features: Math.floor(Math.random() * 100),
          userExperience: Math.floor(Math.random() * 100),
        },
        recommendations: [
          'Improve clarity by using higher contrast colors',
          'Highlight key features more prominently',
          'Use consistent branding across all screenshots',
          'Show more real-world usage scenarios',
          'Ensure text is readable at all sizes'
        ]
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderAnalysis = () => {
    if (!analysis) return null;

    const breakdownLabels = [
      'Layout & Design', 
      'Clarity & Readability', 
      'Branding', 
      'Feature Highlight', 
      'User Experience'
    ];
    
    const breakdownData = {
      labels: breakdownLabels,
      datasets: [
        {
          label: 'Score',
          data: [
            analysis.breakdown.layout,
            analysis.breakdown.clarity,
            analysis.breakdown.branding,
            analysis.breakdown.features,
            analysis.breakdown.userExperience
          ],
          backgroundColor: [
            'rgba(99, 102, 241, 0.5)',  // indigo
            'rgba(16, 185, 129, 0.5)',  // emerald
            'rgba(56, 189, 248, 0.5)',  // sky
            'rgba(251, 146, 60, 0.5)',  // orange
            'rgba(139, 92, 246, 0.5)'   // purple
          ],
          borderColor: [
            'rgba(99, 102, 241, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(56, 189, 248, 0.8)',
            'rgba(251, 146, 60, 0.8)',
            'rgba(139, 92, 246, 0.8)'
          ],
          borderWidth: 1,
        }
      ]
    };

    return (
      <div className="space-y-6">
        {/* Improvement Card */}
        <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">
                Projected Improvement
              </h3>
              <p className="text-sm text-gray-400">
                Based on ASO best practices and AI analysis
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-indigo-400">
                +{analysis.improvement}%
              </div>
              <div className="text-sm text-gray-400">
                {currentConversionRate}% → {Number(currentConversionRate) + analysis.improvement}%
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Breakdown */}
        <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700">
          <h3 className="text-lg font-medium text-white mb-6">Analysis Breakdown</h3>
          <div className="h-64">
            <Bar 
              data={breakdownData} 
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                      color: 'rgba(75, 85, 99, 0.2)'
                    },
                    ticks: {
                      color: '#9CA3AF'
                    }
                  },
                  y: {
                    grid: {
                      display: false
                    },
                    ticks: {
                      color: '#E5E7EB',
                      font: {
                        size: 12
                      }
                    }
                  }
                },
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    titleColor: '#F3F4F6',
                    bodyColor: '#E5E7EB',
                    borderColor: '#374151',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                      label: function(context) {
                        return `Score: ${context.raw}/100`;
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700">
          <h3 className="text-lg font-medium text-white mb-4">Recommendations</h3>
          <div className="grid gap-4">
            {analysis.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start space-x-3 bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-900/50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-300 text-sm flex-1">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Screenshot Conversion Analysis</h2>
        <p className="text-gray-400">
          Compare your existing screenshots with new designs to predict conversion improvement
        </p>
      </div>

      <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700">
        <h3 className="text-lg font-medium text-white mb-4">Enter Your Current Conversion Rate</h3>
        <div className="flex items-center space-x-4">
          <div className="relative w-32">
            <input
              type="text"
              value={currentConversionRate}
              onChange={handleConversionRateChange}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="0.00"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
          </div>
          <span className="text-sm text-gray-400">
            This is the percentage of visitors who install your app after viewing your store page
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-900 text-indigo-300 text-sm font-medium">1</span>
            <h3 className="text-lg font-medium text-white">Upload Existing Screenshots</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">Upload up to 10 screenshots from your current store listing</p>
          
          <div className="relative">
            <input
              ref={existingFileInputRef}
              type="file"
              id="existing-screenshots"
              multiple
              accept="image/*"
              onChange={handleExistingScreenshotsChange}
              className="hidden"
            />
            <label
              htmlFor="existing-screenshots"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-600 rounded-xl hover:border-indigo-500 transition-colors cursor-pointer bg-gray-900/50"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-400">Click to select screenshots</p>
              </div>
              {existingScreenshots.length > 0 && (
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="bg-indigo-900/50 rounded-lg px-3 py-2 text-sm text-indigo-300">
                    {existingScreenshots.length} {existingScreenshots.length === 1 ? 'screenshot' : 'screenshots'} selected
                  </div>
                </div>
              )}
            </label>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-900 text-indigo-300 text-sm font-medium">2</span>
            <h3 className="text-lg font-medium text-white">Upload New Screenshots</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">Upload up to 10 new screenshot designs you want to test</p>
          
          <div className="relative">
            <input
              ref={newFileInputRef}
              type="file"
              id="new-screenshots"
              multiple
              accept="image/*"
              onChange={handleNewScreenshotsChange}
              className="hidden"
            />
            <label
              htmlFor="new-screenshots"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-600 rounded-xl hover:border-indigo-500 transition-colors cursor-pointer bg-gray-900/50"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-400">Click to select screenshots</p>
              </div>
              {newScreenshots.length > 0 && (
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="bg-indigo-900/50 rounded-lg px-3 py-2 text-sm text-indigo-300">
                    {newScreenshots.length} {newScreenshots.length === 1 ? 'screenshot' : 'screenshots'} selected
                  </div>
                </div>
              )}
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={analyzeScreenshots}
          disabled={!currentConversionRate || existingScreenshots.length === 0 || newScreenshots.length === 0 || isAnalyzing}
          className={`px-6 py-3 rounded-lg text-white font-medium flex items-center space-x-2 transition-colors ${
            !currentConversionRate || existingScreenshots.length === 0 || newScreenshots.length === 0
              ? 'bg-gray-700 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isAnalyzing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Analyze & Predict Conversion Improvement</span>
            </>
          )}
        </button>
      </div>

      {analysis && renderAnalysis()}

      <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700">
        <h3 className="text-lg font-medium text-white mb-4">How This Works</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-300">Our AI analyzes your current screenshots and new designs to identify key elements that impact conversion rates</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-gray-300">We compare visual elements, messaging clarity, and user engagement factors</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-300">Based on historical data and industry benchmarks, we predict the potential improvement in conversion rate</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenshotAnalysis; 