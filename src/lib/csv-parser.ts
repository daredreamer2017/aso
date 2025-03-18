import { KeywordData } from './types';

const EXPECTED_HEADERS = [
  'App Name',
  'App ID',
  'Store',
  'Device',
  'Country Code',
  'Language Code',
  'Main App ID',
  'Main App Name',
  'Keyword',
  'Keyword List',
  'Starred',
  'Volume',
  'Difficulty',
  'Maximum Reach',
  'Branded',
  'Branded App ID',
  'Branded App Name',
  'KEI',
  'Chance',
  'Relevancy Score'
];

export const parseCSV = async (file: File): Promise<KeywordData[]> => {
  // Validate file type
  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('Please upload a CSV file');
  }

  const text = await file.text();
  const lines = text.split('\n');
  
  // Remove empty lines and trim whitespace
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  
  if (nonEmptyLines.length === 0) {
    throw new Error('The file is empty. Please provide a file with data.');
  }
  
  if (nonEmptyLines.length < 2) {
    throw new Error('The file must contain a header row and at least one data row.');
  }

  // Detect the separator and clean up headers
  const firstLine = nonEmptyLines[0];
  let separator = '\t';
  
  // If we find more commas than tabs, use comma as separator
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  if (commaCount > tabCount) {
    separator = ',';
  }

  // Function to clean header names
  const cleanHeader = (header: string): string => {
    // Remove quotes and trim whitespace
    return header.replace(/^["']|["']$/g, '').trim();
  };

  // Parse and validate headers
  const headers = nonEmptyLines[0].split(separator).map(cleanHeader);

  // Log the headers for debugging
  console.log('Found headers:', headers);
  console.log('Expected headers:', EXPECTED_HEADERS);
  
  // Check for missing or extra columns
  const missingColumns = EXPECTED_HEADERS.filter(expected => 
    !headers.some(header => header.toLowerCase() === expected.toLowerCase())
  );
  const extraColumns = headers.filter(header => 
    !EXPECTED_HEADERS.some(expected => expected.toLowerCase() === header.toLowerCase())
  );

  if (missingColumns.length > 0 || extraColumns.length > 0) {
    let errorMessage = 'There are issues with the column headers:\n\n';
    
    if (missingColumns.length > 0) {
      errorMessage += 'Missing columns:\n' +
        missingColumns.map(col => `- ${col}`).join('\n') + '\n\n';
    }
    
    if (extraColumns.length > 0) {
      errorMessage += 'Unexpected columns:\n' +
        extraColumns.map(col => `- ${col}`).join('\n') + '\n\n';
    }

    errorMessage += `File appears to be using ${separator === '\t' ? 'tabs' : 'commas'} as separators.\n`;
    errorMessage += `Found ${headers.length} columns: ${headers.join(', ')}\n\n`;
    errorMessage += 'Please ensure:\n';
    errorMessage += '1. The file is tab-separated\n';
    errorMessage += '2. Column names match exactly (including capitalization)\n';
    errorMessage += '3. There are no extra spaces or quotes in column names\n';
    errorMessage += '4. Download and use the sample file as a template';

    throw new Error(errorMessage);
  }

  // Create a map of column indices (case-insensitive)
  const headerMap = new Map(
    headers.map((header, index) => [header.toLowerCase(), index])
  );

  // Function to clean cell values
  const cleanValue = (value: string): string => {
    // Remove quotes and trim whitespace
    return value.replace(/^["']|["']$/g, '').trim();
  };

  // Parse data rows
  const data: KeywordData[] = [];
  const errors: string[] = [];
  
  for (let i = 1; i < nonEmptyLines.length; i++) {
    const values = nonEmptyLines[i].split(separator).map(cleanValue);

    // Skip rows that don't have enough columns
    if (values.length !== headers.length) {
      errors.push(`Row ${i + 1}: Expected ${headers.length} columns but found ${values.length}`);
      continue;
    }

    const getValue = (columnName: string): string => {
      const index = headerMap.get(columnName.toLowerCase());
      return index !== undefined ? values[index] : '';
    };

    // Parse boolean values
    const parseBoolean = (value: string): boolean => 
      value.toLowerCase() === 'true' || value.toLowerCase() === 'yes' || value === '1';

    // Parse numeric values with validation
    const parseNumber = (value: string, min?: number, max?: number): number => {
      const num = parseInt(value);
      if (isNaN(num)) return 0;
      if (min !== undefined && num < min) return min;
      if (max !== undefined && num > max) return max;
      return num;
    };

    const keywordData: KeywordData = {
      // Required fields
      appName: getValue('App Name'),
      appId: getValue('App ID'),
      keyword: getValue('Keyword'),
      
      // Fields with defaults
      store: getValue('Store')?.toLowerCase() === 'ios' ? 'iOS' : 'Android',
      device: getValue('Device') || 'all',
      countryCode: getValue('Country Code') || 'US',
      languageCode: getValue('Language Code') || 'en',
      mainAppId: getValue('Main App ID') || getValue('App ID'),
      mainAppName: getValue('Main App Name') || getValue('App Name'),
      keywordList: getValue('Keyword List') || getValue('Keyword'),
      starred: parseBoolean(getValue('Starred')),
      volume: getValue('Volume') ? parseNumber(getValue('Volume'), 0) : undefined,
      difficulty: getValue('Difficulty') ? parseNumber(getValue('Difficulty'), 0, 100) : 0,
      maximumReach: parseNumber(getValue('Maximum Reach'), 0),
      branded: parseBoolean(getValue('Branded')),
      brandedAppId: getValue('Branded App ID') || undefined,
      brandedAppName: getValue('Branded App Name') || undefined,
      kei: parseNumber(getValue('KEI'), 0, 100),
      chance: parseNumber(getValue('Chance'), 0, 100),
      relevancyScore: parseNumber(getValue('Relevancy Score'), 0, 100)
    };

    // Validate required fields have values
    const missingRequiredFields = [];
    if (!keywordData.appName) missingRequiredFields.push('App Name');
    if (!keywordData.appId) missingRequiredFields.push('App ID');
    if (!keywordData.keyword) missingRequiredFields.push('Keyword');
    
    if (missingRequiredFields.length > 0) {
      errors.push(`Row ${i + 1}: Missing values for: ${missingRequiredFields.join(', ')}`);
      continue;
    }

    data.push(keywordData);
  }

  if (errors.length > 0) {
    throw new Error(
      'Found the following issues in your file:\n\n' +
      errors.join('\n') +
      '\n\nPlease fix these issues and try uploading again.'
    );
  }

  if (data.length === 0) {
    throw new Error('No valid data rows were found in the file.');
  }

  return data;
};