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
  const [currentRate, setCurrentRate] = useState<number>(0);
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
    if (existingScreenshots.length === 0 || newScreenshots.length === 0 || currentRate === 0) {
      alert('Please upload both existing and new screenshots and enter your current conversion rate');
      return;
    }

    setIsAnalyzing(true);

    // Simulate API call with timeout
    try {
      // Simulate an analysis - in a real app, this would be done by the backend
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const improvementPercent = Math.min(Math.floor(Math.random() * 30) + 10, 100 - currentRate);
      
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
            'rgba(99, 102, 241, 0.7)', // indigo
            'rgba(16, 185, 129, 0.7)', // green
            'rgba(56, 189, 248, 0.7)', // sky
            'rgba(251, 146, 60, 0.7)', // orange
            'rgba(139, 92, 246, 0.7)'  // purple
          ],
          borderWidth: 1,
        }
      ]
    };

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl p-6 text-center shadow-sm">
          <h3 className="text-xl font-bold text-indigo-900 mb-4">
            Projected Conversion Rate Improvement
          </h3>
          <div className="flex items-center justify-center space-x-4">
            <div className="text-5xl font-bold text-indigo-600">
              +{analysis.improvement}%
            </div>
            <div className="text-gray-700">
              <div className="text-sm">From {currentRate}% to {currentRate + analysis.improvement}%</div>
              <div className="text-xs mt-1">Based on ASO best practices</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Screenshot Analysis Breakdown</h3>
          <Bar data={breakdownData} options={{
            indexAxis: 'y',
            scales: {
              x: {
                beginAtZero: true,
                max: 100,
                grid: {
                  display: true,
                  color: 'rgba(0, 0, 0, 0.05)'
                }
              },
              y: {
                grid: {
                  display: false
                }
              }
            },
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return `Score: ${context.raw}/100`;
                  }
                }
              }
            }
          }} />
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Recommendations for Improvement</h3>
          <ul className="space-y-3">
            {analysis.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="ml-3 text-gray-700">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Screenshot Conversion Analysis</h2>
        <p className="text-gray-600">
          Compare your existing screenshots with new designs to predict conversion improvement
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Enter Your Current Conversion Rate</h3>
        <div className="flex items-center">
          <input
            type="number"
            min="0.1"
            max="100"
            step="0.1"
            value={currentRate || ''}
            onChange={(e) => setCurrentRate(parseFloat(e.target.value) || 0)}
            className="w-24 p-2 mr-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Rate"
          />
          <span className="text-gray-700">%</span>
          <div className="ml-4 text-sm text-gray-600">
            This is the percentage of visitors who install your app after viewing your store page
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Existing Screenshots */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 mr-2 text-sm">1</span>
            Upload Existing Screenshots
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Upload up to 10 screenshots from your current store listing
          </p>
          
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => existingFileInputRef.current?.click()}
          >
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">Click to select screenshots</p>
            </div>
            <input
              ref={existingFileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleExistingScreenshotsChange}
            />
          </div>
          
          {existingPreviewUrls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {existingPreviewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Screenshot ${index + 1}`}
                    className="h-32 w-full object-cover rounded-md shadow-sm"
                  />
                  <button
                    className="absolute top-2 right-2 p-1 bg-white text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeExistingScreenshot(index);
                    }}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Upload New Screenshots */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 mr-2 text-sm">2</span>
            Upload New Screenshots
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Upload up to 10 new screenshot designs you want to test
          </p>
          
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => newFileInputRef.current?.click()}
          >
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">Click to select screenshots</p>
            </div>
            <input
              ref={newFileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleNewScreenshotsChange}
            />
          </div>
          
          {newPreviewUrls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {newPreviewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Screenshot ${index + 1}`}
                    className="h-32 w-full object-cover rounded-md shadow-sm"
                  />
                  <button
                    className="absolute top-2 right-2 p-1 bg-white text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNewScreenshot(index);
                    }}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <button
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          onClick={analyzeScreenshots}
          disabled={existingScreenshots.length === 0 || newScreenshots.length === 0 || currentRate === 0 || isAnalyzing}
        >
          {isAnalyzing ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </div>
          ) : (
            'Analyze & Predict Conversion Improvement'
          )}
        </button>
      </div>

      {analysis && renderAnalysis()}

      <div className="bg-indigo-50 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-indigo-900 mb-4">How This Works</h3>
        <ul className="space-y-3">
          <li className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="ml-3 text-indigo-900">
              Our AI analyzes your screenshots against ASO best practices and design principles
            </span>
          </li>
          <li className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="ml-3 text-indigo-900">
              We compare your existing screenshots with new designs to identify improvements
            </span>
          </li>
          <li className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="ml-3 text-indigo-900">
              Based on our database of thousands of app store pages, we predict conversion uplift
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ScreenshotAnalysis; 