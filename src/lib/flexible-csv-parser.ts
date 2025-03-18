import Papa from 'papaparse';

export interface ParsedAppData {
  id: string;
  appDetails: {
    appName?: string;
    appId?: string;
    store?: string;
    category?: string;
    currentInstalls?: number;
  };
  keywords: KeywordData[];
  missingFields: string[];
  availableFields: string[];
}

export interface KeywordData {
  keyword: string;
  volume?: number;
  difficulty?: number;
  currentRank?: number;
  relevancy?: number;
  traffic?: number;
  competition?: number;
  cpc?: number;
  maximumReach?: number;
  trend?: number[];
  [key: string]: any; // Allow for any additional fields we might find in the CSV
}

export async function parseCSVData(file: File): Promise<ParsedAppData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedData = processCSVResults(results.data);
          resolve(parsedData);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

function processCSVResults(data: any[]): ParsedAppData {
  if (!data || data.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Analyze available fields from the first row
  const firstRow = data[0];
  const availableFields = Object.keys(firstRow).filter(key => key.trim() !== '');
  
  // Map common field names to standardized format
  const fieldMap: { [key: string]: string } = {
    // App related fields
    'app name': 'appName',
    'app_name': 'appName',
    'application name': 'appName',
    'app id': 'appId',
    'app_id': 'appId',
    'bundle id': 'appId',
    'package name': 'appId',
    'store': 'store',
    'platform': 'store',
    'category': 'category',
    'installs': 'currentInstalls',
    'downloads': 'currentInstalls',
    'current installs': 'currentInstalls',
    
    // Keyword related fields
    'keyword': 'keyword',
    'term': 'keyword',
    'search term': 'keyword',
    'query': 'keyword',
    'volume': 'volume',
    'search volume': 'volume',
    'monthly searches': 'volume',
    'traffic': 'volume',
    'difficulty': 'difficulty',
    'keyword difficulty': 'difficulty',
    'competition': 'difficulty',
    'rank': 'currentRank',
    'current rank': 'currentRank',
    'position': 'currentRank',
    'rankings': 'currentRank',
    'relevancy': 'relevancy',
    'relevance': 'relevancy',
    'relevance score': 'relevancy',
    'reach': 'maximumReach',
    'maximum reach': 'maximumReach',
    'potential reach': 'maximumReach',
    'cpc': 'cpc',
    'cost per click': 'cpc',
  };

  // Determine which fields are available and which are missing
  const standardizedAvailableFields = availableFields.map(field => {
    const lowerField = field.toLowerCase();
    return fieldMap[lowerField] || lowerField;
  });

  const requiredFields = ['keyword'];
  const missingFields = requiredFields.filter(
    field => !standardizedAvailableFields.includes(field) && 
    !availableFields.some(f => fieldMap[f.toLowerCase()] === field)
  );

  if (missingFields.includes('keyword')) {
    throw new Error('CSV file must contain a keyword column');
  }

  // Extract app details from the first row
  const appDetails: any = {};
  const appFields = ['appName', 'appId', 'store', 'category', 'currentInstalls'];
  
  appFields.forEach(field => {
    const matchingField = findMatchingField(firstRow, field, fieldMap);
    if (matchingField) {
      const value = firstRow[matchingField];
      if (field === 'currentInstalls' && value) {
        appDetails[field] = parseNumericValue(value);
      } else if (value) {
        appDetails[field] = value;
      }
    }
  });

  // Process keywords data
  const keywords: KeywordData[] = [];
  const keywordField = findKeywordField(firstRow, fieldMap);
  
  if (!keywordField) {
    throw new Error('Could not find a keyword column in the CSV');
  }

  const seenKeywords = new Set<string>();

  data.forEach((row) => {
    const keyword = row[keywordField];
    if (!keyword || seenKeywords.has(keyword)) return;
    
    seenKeywords.add(keyword);
    
    const keywordData: KeywordData = { keyword };
    
    // Process all available fields
    Object.keys(row).forEach(field => {
      const standardField = fieldMap[field.toLowerCase()] || field.toLowerCase();
      
      // Skip fields that are used for app details
      if (appFields.includes(standardField) || standardField === 'keyword') return;
      
      const value = row[field];
      if (value === undefined || value === null || value === '') return;
      
      // Handle numeric fields
      const numericFields = ['volume', 'difficulty', 'currentRank', 'relevancy', 'traffic', 'cpc', 'maximumReach'];
      if (numericFields.includes(standardField)) {
        keywordData[standardField] = parseNumericValue(value);
      } else {
        keywordData[standardField] = value;
      }
    });
    
    keywords.push(keywordData);
  });

  // Generate a unique ID for this dataset
  const id = generateId();

  return {
    id,
    appDetails,
    keywords,
    missingFields,
    availableFields: standardizedAvailableFields
  };
}

function findMatchingField(row: any, targetField: string, fieldMap: { [key: string]: string }): string | null {
  // Direct match
  if (row[targetField] !== undefined) return targetField;
  
  // Match using field map
  for (const [csvField, standardField] of Object.entries(fieldMap)) {
    if (standardField === targetField && row[csvField] !== undefined) {
      return csvField;
    }
  }
  
  // Case-insensitive match
  const lowercaseTarget = targetField.toLowerCase();
  for (const field of Object.keys(row)) {
    if (field.toLowerCase() === lowercaseTarget) {
      return field;
    }
  }
  
  return null;
}

function findKeywordField(row: any, fieldMap: { [key: string]: string }): string | null {
  for (const field of Object.keys(row)) {
    const lowercaseField = field.toLowerCase();
    if (
      lowercaseField === 'keyword' || 
      lowercaseField === 'term' || 
      lowercaseField === 'search term' || 
      lowercaseField === 'query' ||
      fieldMap[lowercaseField] === 'keyword'
    ) {
      return field;
    }
  }
  return null;
}

function parseNumericValue(value: string | number): number {
  if (typeof value === 'number') return value;
  
  const cleanValue = value.toString().replace(/[,%$]/g, '');
  const parsedValue = parseFloat(cleanValue);
  
  if (isNaN(parsedValue)) return 0;
  return parsedValue;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
    Math.random().toString(36).substring(2, 15);
} 