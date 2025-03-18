import React, { useState } from 'react';
import { KeywordData } from '@/lib/types';

interface MetadataOption {
  title: string;
  subtitle: string;
  keywords: string[];
}

interface ASOMetadataGeneratorProps {
  selectedKeywords: string[];
  currentInstalls: number;
}

export const ASOMetadataGenerator: React.FC<ASOMetadataGeneratorProps> = ({ 
  selectedKeywords = [], 
  currentInstalls 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<MetadataOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generateMetadata = async () => {
    if (selectedKeywords.length === 0) {
      setError('Please select at least one keyword to generate metadata.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: selectedKeywords,
          currentInstalls,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate metadata');
      }

      const data = await response.json();
      setOptions(data.options);
    } catch (err) {
      setError('An error occurred while generating metadata. Please try again.');
      console.error('Error generating metadata:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">AI Metadata Generator</h2>
        <p className="text-gray-600">
          Generate optimized app store metadata using {selectedKeywords.length} selected keywords
        </p>
      </div>

      <div className="flex justify-center">
        <button
          onClick={generateMetadata}
          disabled={isLoading || selectedKeywords.length === 0}
          className={`
            px-6 py-3 rounded-lg font-medium text-white
            transition-all duration-200 ease-in-out
            ${isLoading 
              ? 'bg-indigo-400 cursor-not-allowed'
              : selectedKeywords.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
            }
          `}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generating...</span>
            </div>
          ) : (
            'Generate Metadata'
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {options.length > 0 && (
        <div className="space-y-6">
          {options.map((option, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Option {index + 1}</h3>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Title</h4>
                  <p className="text-gray-900">{option.title}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Subtitle</h4>
                  <p className="text-gray-900">{option.subtitle}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {option.keywords.map((keyword, kidx) => (
                      <span
                        key={kidx}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Title: ${option.title}\nSubtitle: ${option.subtitle}\nKeywords: ${option.keywords.join(', ')}`
                    );
                  }}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Copy to clipboard
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 