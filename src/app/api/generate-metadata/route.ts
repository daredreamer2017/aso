import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { keywords } = await request.json();
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid keywords in request body' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Generate metadata options
    const options = generateMetadataOptions(keywords);

    return new NextResponse(
      JSON.stringify({ suggestion: options }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in generate-metadata API:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

function generateMetadataOptions(keywords: string[]) {
  // Include "sahsah" and "sahseh" in the keywords
  const allKeywords = [...keywords];
  if (!keywords.includes('sahsah')) {
    allKeywords.push('sahsah');
  }
  if (!keywords.includes('sahseh')) {
    allKeywords.push('sahseh');
  }

  // Generate 3 options with different patterns
  return Array(3).fill(null).map((_, index) => generateOption(allKeywords, index + 1));
}

function generateOption(keywords: string[], seed: number) {
  // Title patterns
  const titlePatterns = [
    (kw: string) => `Easy ${kw} - Track Your Progress`,
    (kw: string) => `${kw} Pro - Smart Tracking & Analysis`,
    (kw: string) => `Ultimate ${kw} Assistant & Tracker`,
    (kw: string) => `${kw} Master - Professional Tools`,
    (kw: string) => `Smart ${kw} - Your Personal Guide`
  ];

  // Subtitle patterns
  const subtitlePatterns = [
    (kw: string) => `Boost your ${kw} results with AI-powered insights`,
    (kw: string) => `Professional ${kw} tools for better performance`,
    (kw: string) => `Smart ${kw} tracking & personalized recommendations`,
    (kw: string) => `Advanced ${kw} analytics for professionals`,
    (kw: string) => `The ultimate ${kw} companion for success`
  ];

  // Select main keyword and patterns
  const mainKeyword = keywords[Math.floor(Math.random() * keywords.length)];
  const titlePattern = titlePatterns[seed % titlePatterns.length];
  const subtitlePattern = subtitlePatterns[seed % subtitlePatterns.length];

  // Generate title and subtitle
  const title = titlePattern(mainKeyword.charAt(0).toUpperCase() + mainKeyword.slice(1)).slice(0, 30);
  const subtitle = subtitlePattern(mainKeyword.toLowerCase()).slice(0, 30);

  // Generate keywords
  const modifiers = ['pro', 'best', 'top', 'smart', 'easy', 'professional'];
  const baseKeywords = [...keywords];
  
  // Add modified versions of keywords
  keywords.forEach(keyword => {
    const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
    baseKeywords.push(`${modifier} ${keyword}`);
  });
  
  // Shuffle and limit to 100 characters
  const shuffled = baseKeywords.sort(() => Math.random() - 0.5);
  let keywordsString = '';
  for (const keyword of shuffled) {
    if ((keywordsString + keyword).length <= 97) { // Leave room for commas
      keywordsString += (keywordsString ? ', ' : '') + keyword;
    }
  }

  return {
    title,
    subtitle,
    keywords: keywordsString
  };
} 