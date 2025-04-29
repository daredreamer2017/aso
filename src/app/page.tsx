'use client';

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleDashboardClick = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="relative">
        {/* Background gradient effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-gray-900 to-gray-900" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <main className="flex flex-col items-center">
            {/* Hero Section */}
            <div className="text-center mb-16 space-y-6">
              <div className="inline-block mb-4">
                <div className="w-24 h-24 bg-indigo-600 rounded-2xl shadow-xl flex items-center justify-center transform rotate-12 relative">
                  <div className="w-20 h-20 bg-indigo-500 rounded-xl absolute animate-pulse"></div>
                  <svg className="w-12 h-12 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <h1 className="text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                ASO Dashboard
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Upload your keyword data to get comprehensive ASO analysis and recommendations
                for improving your app's visibility and installs.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 w-full max-w-6xl">
              {/* Keyword Analysis Card */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-700/50 p-8 transform transition-all duration-300 hover:scale-105 hover:bg-gray-800/70">
                <div className="w-14 h-14 bg-indigo-900/30 rounded-xl flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Keyword Analysis</h3>
                <p className="text-gray-400">
                  Upload CSV files with keyword data to analyze performance metrics and identify opportunities.
                </p>
              </div>

              {/* Ranking Predictions Card */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-700/50 p-8 transform transition-all duration-300 hover:scale-105 hover:bg-gray-800/70">
                <div className="w-14 h-14 bg-purple-900/30 rounded-xl flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Ranking Predictions</h3>
                <p className="text-gray-400">
                  Get predictions for ranking improvements and potential install impact over time.
                </p>
              </div>

              {/* ASO Recommendations Card */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-700/50 p-8 transform transition-all duration-300 hover:scale-105 hover:bg-gray-800/70">
                <div className="w-14 h-14 bg-indigo-900/30 rounded-xl flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">ASO Recommendations</h3>
                <p className="text-gray-400">
                  Receive actionable recommendations to optimize your app's metadata for better visibility.
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <button 
              onClick={handleDashboardClick}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg hover:from-indigo-500 hover:to-purple-500 transform transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
            >
              <span>Go to Dashboard</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 ml-2 transform transition-transform group-hover:translate-x-1" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </main>

          {/* Footer */}
          <footer className="mt-16 text-center">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} ASO Dashboard | Powered by Next.js
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
