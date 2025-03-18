import React, { useState } from 'react';
import { KeywordData } from '@/lib/types';

interface KeywordTableProps {
  data: KeywordData[];
  selectedKeywords: string[];
  onKeywordSelect: (keywords: string[]) => void;
  onKeywordClick: (keyword: string) => void;
}

const KeywordTable: React.FC<KeywordTableProps> = ({
  data,
  selectedKeywords,
  onKeywordSelect,
  onKeywordClick,
}) => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof KeywordData;
    direction: 'asc' | 'desc';
  }>({ key: 'volume', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');

  const handleSort = (key: keyof KeywordData) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue === undefined || bValue === undefined) return 0;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    return sortConfig.direction === 'asc'
      ? Number(aValue) - Number(bValue)
      : Number(bValue) - Number(aValue);
  });

  const filteredData = sortedData.filter(item =>
    item.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleKeywordToggle = (keyword: string) => {
    const newSelection = selectedKeywords.includes(keyword)
      ? selectedKeywords.filter(k => k !== keyword)
      : [...selectedKeywords, keyword];
    onKeywordSelect(newSelection);
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 30) return 'text-green-600';
    if (difficulty <= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Keywords Analysis</h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Search keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectedKeywords.length === data.length}
                  onChange={() => {
                    if (selectedKeywords.length === data.length) {
                      onKeywordSelect([]);
                    } else {
                      onKeywordSelect(data.map(k => k.keyword));
                    }
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('keyword')}
              >
                Keyword
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('volume')}
              >
                Volume
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('difficulty')}
              >
                Difficulty
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('currentRank')}
              >
                Current Rank
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('maximumReach')}
              >
                Max Reach
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.map((item) => (
              <tr
                key={item.keyword}
                className={`hover:bg-gray-50 cursor-pointer ${
                  selectedKeywords.includes(item.keyword) ? 'bg-indigo-50' : ''
                }`}
                onClick={() => onKeywordClick(item.keyword)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedKeywords.includes(item.keyword)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleKeywordToggle(item.keyword);
                    }}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{item.keyword}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{item.volume || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm font-medium ${getDifficultyColor(item.difficulty || 0)}`}>
                    {item.difficulty || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">#{item.currentRank || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{item.maximumReach?.toLocaleString() || 'N/A'}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KeywordTable; 