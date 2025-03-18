import React, { useRef } from 'react';
import { parseCSVData, ParsedAppData } from '@/lib/flexible-csv-parser';

interface FileUploadProps {
  onDataLoaded: (data: ParsedAppData) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onDataLoaded, 
  isLoading, 
  setIsLoading 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dragActive, setDragActive] = React.useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const parsedData = await parseCSVData(file);
      onDataLoaded(parsedData);
    } catch (err) {
      console.error('Error processing CSV:', err);
      setError(err instanceof Error ? err.message : 'Failed to process the CSV file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!dragActive) setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Upload Keyword Data</h2>
        <p className="mt-1 text-sm text-gray-500">
          Our AI will analyze your data and provide insights and recommendations
        </p>
      </div>

      <div 
        className={`border-2 ${dragActive ? 'border-indigo-600 bg-indigo-50' : 'border-dashed border-gray-300'} rounded-lg p-6 transition-colors duration-200`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="text-center">
          <svg 
            className={`mx-auto h-12 w-12 ${dragActive ? 'text-indigo-600' : 'text-gray-400'}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>
          <div className="mt-4 flex text-sm text-gray-600 justify-center">
            <label 
              htmlFor="file-upload" 
              className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
            >
              <span>Upload a CSV file</span>
              <input
                ref={fileInputRef}
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isLoading}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            CSV files up to 10MB
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-700">Processing your data...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">File Requirements</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>CSV format with column headers</li>
                <li>Should include keyword data (e.g., keyword, volume, difficulty, current rank)</li>
                <li>Can include app details (e.g., app name, app ID, store)</li>
                <li>Don't worry if some data is missing - our AI will work with what's available</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload; 