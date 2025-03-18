import React, { useState } from 'react';
import { KeywordData } from '@/lib/types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface KeywordDetailsProps {
  keyword: string;
  data: KeywordData | undefined;
}

const KeywordDetails: React.FC<KeywordDetailsProps> = ({ keyword, data }) => {
  const [showAllScenarios, setShowAllScenarios] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('6');

  if (!data) return null;

  const calculateMarketOpportunity = () => {
    if (!data.volume || !data.difficulty) return 0;
    const currentRank = data.currentRank || 100;
    const maxPotentialCTR = 0.35; // Top position CTR
    const currentCTR = 0.35 * Math.exp(-0.15 * currentRank);
    const potentialGrowth = maxPotentialCTR - currentCTR;
    const opportunityScore = (data.volume * potentialGrowth * (100 - data.difficulty)) / 100;
    return Math.floor(opportunityScore);
  };

  const getCompetitiveLandscape = () => {
    const difficulty = data.difficulty || 0;
    if (difficulty <= 30) {
      return {
        status: 'High Opportunity',
        description: 'Low competition with significant growth potential. Quick wins possible.',
        color: 'text-green-600',
        timeToRank: '1-3 months'
      };
    }
    if (difficulty <= 60) {
      return {
        status: 'Moderate Opportunity',
        description: 'Balanced competition. Strategic approach needed for growth.',
        color: 'text-blue-600',
        timeToRank: '3-6 months'
      };
    }
    return {
      status: 'Challenging',
      description: 'High competition requires long-term strategy and content optimization.',
      color: 'text-yellow-600',
      timeToRank: '6-12 months'
    };
  };

  // Calculate potential install improvement based on rank improvement and market factors
  const calculatePotentialInstalls = (rankImprovement: number, months: number) => {
    if (!data.volume || !data.difficulty) return 0;
    
    const currentRank = data.currentRank || 100;
    const targetRank = Math.max(1, currentRank - rankImprovement);
    
    // Enhanced CTR curve based on real-world ASO data
    const getCTR = (rank: number) => {
      if (rank <= 1) return 0.35;
      if (rank <= 5) return 0.15;
      if (rank <= 10) return 0.08;
      if (rank <= 20) return 0.04;
      return 0.35 * Math.exp(-0.2 * rank);
    };
    
    const currentCTR = getCTR(currentRank);
    const improvedCTR = getCTR(targetRank);
    const ctrImprovement = improvedCTR - currentCTR;
    
    // Market penetration with faster initial growth
    const marketPenetration = 1 - Math.exp(-0.15 * months);
    
    // Competition factor with more weight on difficulty
    const competitionFactor = Math.pow(1 - (data.difficulty / 100), 0.7);
    
    // Calculate base potential installs with market size consideration
    const marketSize = data.maximumReach || data.volume * 2;
    const basePotential = Math.min(
      marketSize,
      data.volume * ctrImprovement * marketPenetration * competitionFactor
    );
    
    // Enhanced seasonality factor based on historical patterns
    const seasonalityFactor = 1 + 0.3 * Math.sin(2 * Math.PI * (new Date().getMonth() / 12));
    
    return Math.floor(Math.max(0, basePotential * seasonalityFactor));
  };

  // Generate ranking improvement scenarios
  const allScenarios = [
    { 
      months: 3,
      improvements: [5, 10, 15],
      strategy: 'Quick optimization of existing assets'
    },
    { 
      months: 6,
      improvements: [15, 25, 35],
      strategy: 'Content refresh and targeted keyword optimization'
    },
    { 
      months: 9,
      improvements: [25, 40, 55],
      strategy: 'Deep metadata optimization and review management'
    },
    { 
      months: 12,
      improvements: [35, 55, 75],
      strategy: 'Complete ASO overhaul with continuous optimization'
    },
  ];

  const visibleScenarios = showAllScenarios 
    ? allScenarios 
    : allScenarios.filter(s => s.months.toString() === selectedTimeframe);

  const chartData = {
    labels: allScenarios.map(s => `${s.months} Months`),
    datasets: [
      {
        label: 'Conservative',
        data: allScenarios.map(s => calculatePotentialInstalls(s.improvements[0], s.months)),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        fill: true
      },
      {
        label: 'Moderate',
        data: allScenarios.map(s => calculatePotentialInstalls(s.improvements[1], s.months)),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.3,
        fill: true
      },
      {
        label: 'Aggressive',
        data: allScenarios.map(s => calculatePotentialInstalls(s.improvements[2], s.months)),
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.3,
        fill: true
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Projected Install Growth Scenarios',
        font: { size: 16 }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw as number;
            return `${context.dataset.label}: ${value.toLocaleString()} potential installs`;
          },
        },
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        beginAtZero: true,
        ticks: {
          callback: function(tickValue: number | string) {
            const value = Number(tickValue);
            return value.toLocaleString();
          }
        },
      },
    },
  } as const;

  const landscape = getCompetitiveLandscape();
  const opportunity = calculateMarketOpportunity();

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 30) return 'text-green-600';
    if (difficulty <= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getReachPercentage = () => {
    if (!data.maximumReach) return 0;
    return Math.min(100, Math.round((data.volume || 0) / data.maximumReach * 100));
  };

  const getRankStatus = () => {
    if (!data.currentRank) return { text: 'Not Ranked', color: 'text-gray-600' };
    if (data.currentRank <= 10) return { text: 'Excellent', color: 'text-green-600' };
    if (data.currentRank <= 50) return { text: 'Good', color: 'text-blue-600' };
    if (data.currentRank <= 100) return { text: 'Fair', color: 'text-yellow-600' };
    return { text: 'Needs Improvement', color: 'text-red-600' };
  };

  return (
    <div className="p-6 space-y-8">
      <div className="border-b border-gray-200 pb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{keyword}</h2>
            <p className="text-gray-500">Market Analysis & Growth Forecast</p>
          </div>
          <div className={`px-4 py-2 rounded-full ${landscape.color} bg-opacity-10`}>
            <span className={`text-sm font-semibold ${landscape.color}`}>
              {landscape.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Market Size</h3>
          <p className="text-2xl font-bold text-gray-900">{data.volume?.toLocaleString() || '0'}</p>
          <div className="mt-2">
            <div className="text-sm text-gray-500">
              Monthly Search Volume
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Potential Reach: {data.maximumReach?.toLocaleString() || 'Unknown'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Competition Level</h3>
          <p className={`text-2xl font-bold ${getDifficultyColor(data.difficulty || 0)}`}>
            {data.difficulty || '0'}/100
          </p>
          <div className="mt-2">
            <p className="text-sm text-gray-600">{landscape.description}</p>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Est. Time to Rank: {landscape.timeToRank}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Current Position</h3>
          <div className="flex items-baseline space-x-2">
            <p className={`text-2xl font-bold ${getRankStatus().color}`}>
              {data.currentRank ? `#${data.currentRank}` : 'Not Ranked'}
            </p>
            {data.currentRank && data.volume && (
              <span className="text-sm text-gray-500">
                of {data.maximumReach ? Math.ceil(data.maximumReach / data.volume) : '∞'} apps
              </span>
            )}
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-600">
              Market Opportunity Score: {opportunity.toLocaleString()}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-indigo-600 rounded-full h-2 transition-all duration-500"
                style={{ width: `${Math.min(100, (opportunity / 10000) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Growth Forecast</h3>
            <p className="text-sm text-gray-500 mt-1">
              Projected installs based on ranking improvements
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="rounded-md border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              {allScenarios.map(s => (
                <option key={s.months} value={s.months}>{s.months} Months</option>
              ))}
            </select>
            <button
              onClick={() => setShowAllScenarios(!showAllScenarios)}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              {showAllScenarios ? 'Show Less' : 'Show All Timeframes'}
            </button>
          </div>
        </div>
        
        <div className="mb-8">
          <Line data={chartData} options={chartOptions} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {visibleScenarios.map((scenario) => (
            <div
              key={scenario.months}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <h4 className="text-sm font-medium text-gray-500 mb-2">
                {scenario.months} Month Strategy
              </h4>
              <p className="text-xs text-gray-600 mb-4">{scenario.strategy}</p>
              <div className="space-y-4">
                {scenario.improvements.map((improvement, idx) => {
                  const labels = ['Conservative', 'Moderate', 'Aggressive'];
                  const colors = ['text-blue-600', 'text-indigo-600', 'text-purple-600'];
                  const installs = calculatePotentialInstalls(improvement, scenario.months);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={colors[idx]}>{labels[idx]}</span>
                        <span className="font-medium text-gray-900">
                          +{improvement} ranks
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Potential Installs</span>
                        <span className="font-medium text-gray-900">
                          {installs.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`rounded-full h-1.5 transition-all duration-500 ${colors[idx].replace('text', 'bg')}`}
                          style={{
                            width: `${Math.min(100, (installs / opportunity) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KeywordDetails; 