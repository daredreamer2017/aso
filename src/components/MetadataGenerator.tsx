import React, { useState } from 'react';

interface MetaDataOptions {
  titles: string[];
  subtitles: string[];
  keywordOptions: string[];
}

interface MetaDataGeneratorProps {
  selectedKeywords: string[];
}

const MetaDataGenerator: React.FC<MetaDataGeneratorProps> = ({ selectedKeywords }) => {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<MetaDataOptions | null>(null);
  const [error, setError] = useState('');

  const generateMetadata = async () => {
    setLoading(true);
    setError('');
    setOptions(null);
    try {
      const response = await fetch('/api/generate-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: selectedKeywords })
      });
      if (!response.ok) {
        throw new Error('Failed to generate metadata');
      }
      const data = await response.json();
      // expecting the API to return an object with the suggestion in the form of { titles, subtitles, keywordOptions }
      setOptions(data.suggestion);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mt-8">
      <h3 className="text-xl font-bold mb-4">Generate App Metadata</h3>
      <p className="mb-4 text-gray-600 dark:text-gray-300">Based on the selected keywords: <strong>{selectedKeywords.join(', ')}</strong></p>
      <button 
        onClick={generateMetadata}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        disabled={loading}
      >
        {loading ? 'Generating...' : 'Generate Options'}
      </button>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {options && (
        <div className="mt-4">
          <h4 className="font-bold">Title Options:</h4>
          <ul className="list-disc ml-6">{options.titles.map((title, idx) => (<li key={idx}>{title}</li>))}</ul>
          <h4 className="font-bold mt-4">Subtitle Options:</h4>
          <ul className="list-disc ml-6">{options.subtitles.map((subtitle, idx) => (<li key={idx}>{subtitle}</li>))}</ul>
          <h4 className="font-bold mt-4">Keyword Options:</h4>
          <ul className="list-disc ml-6">{options.keywordOptions.map((kw, idx) => (<li key={idx}>{kw}</li>))}</ul>
        </div>
      )}
    </div>
  );
};

export default MetaDataGenerator; 