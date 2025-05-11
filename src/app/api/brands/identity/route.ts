import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { COUNTRIES } from '@/lib/constants';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';

// In-memory rate limiting - consider a more robust solution for production
const rateLimit = new Map<string, { count: number, timestamp: number }>();
const RATE_LIMIT_PERIOD = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5; // 5 requests per minute

// Simplified OpenAI client initialization: Prioritizes Azure, falls back to standard OpenAI if configured, else error.
const getOpenAIClientOrThrow = () => {
  if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_DEPLOYMENT) {
    try {
      return new OpenAI({
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
        defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2023-05-15' },
        defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY },
      });
    } catch (azureError) {
      // Log actual azureError to a secure server-side logging system in production
      // Fall through to check standard OpenAI if Azure init fails but standard one is configured
    }
  }
  if (process.env.OPENAI_API_KEY) {
    try {
      return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } catch (openAIError) {
      // Log actual openAIError to a secure server-side logging system in production
      throw new Error('Standard OpenAI client initialization failed. Check API key.');
    }
  }
  throw new Error('OpenAI service is not configured on the server. Please set Azure or standard OpenAI API keys and endpoints.');
};

// Validate URL function
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

// Get language name from language code
function getLanguageName(languageCode: string): string {
  const languageMap: Record<string, string> = {
    'en-GB': 'British English',
    'en-US': 'American English',
    'fr-FR': 'French',
    'de-DE': 'German',
    'es-ES': 'Spanish',
    'it-IT': 'Italian',
    'nl-NL': 'Dutch',
    'pt-PT': 'Portuguese',
    'ja-JP': 'Japanese',
    'zh-CN': 'Chinese (Simplified)',
    'ar-SA': 'Arabic',
    'ru-RU': 'Russian'
  };
  
  return languageMap[languageCode] || languageCode;
}

// Function to extract website content from a URL
async function scrapeWebsiteContent(url: string): Promise<string> {
  try {
    const axios = require('axios');
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 compatible MixerAIContentScraper/1.0', 'Accept': 'text/html', 'Accept-Language': 'en-GB,en;q=0.5' },
      timeout: 8000 // 8 second timeout
    });
    const htmlContent = response.data;
    
    // Very basic HTML to text conversion
    const textContent = htmlContent
      .toString()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Get a reasonable chunk of content
    const truncatedContent = textContent.substring(0, 5000);
    
    return truncatedContent;
  } catch (error: any) {
    // Log scraping errors to a secure server-side log in production.
    // Return an empty string or a specific marker if content extraction fails, rather than error string in content.
    return ''; // Or throw a specific error to be handled upstream
  }
}

export const POST = withAuthAndMonitoring(async (req: NextRequest, user) => {
  // Rate limiting logic remains as is for now.
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown'; // Enhanced IP detection
  const now = Date.now();
  
  if (rateLimit.has(ip)) {
    const userRateLimit = rateLimit.get(ip)!;
    if (now - userRateLimit.timestamp > RATE_LIMIT_PERIOD) {
      userRateLimit.count = 1;
      userRateLimit.timestamp = now;
    } else if (userRateLimit.count >= MAX_REQUESTS) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    } else {
      userRateLimit.count += 1;
    }
  } else {
    rateLimit.set(ip, { count: 1, timestamp: now });
  }
  
  try {
    const body = await req.json();
    const name = body.name || body.brandName;
    let urls = body.urls || [];
    
    // If urls is a string, convert to array
    if (typeof urls === 'string') {
      urls = [urls];
    } else if (!Array.isArray(urls)) {
      urls = [];
    }
    
    // Get country and language with defaults
    const country = body.country || 'GB';
    const language = body.language || 'en-GB';
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Brand name is required' },
        { status: 400 }
      );
    }
    
    if (urls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one URL is required' },
        { status: 400 }
      );
    }
    
    // Filter to valid URLs
    const validUrls = urls.filter((url): url is string => typeof url === 'string' && isValidUrl(url));
    if (validUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid URLs provided' },
        { status: 400 }
      );
    }
    
    const openai = getOpenAIClientOrThrow(); // Throws if no client can be configured.

    // Get content from URLs
    const contentPromises = validUrls.map(url => scrapeWebsiteContent(url));
    const contents = await Promise.all(contentPromises);
    
    // Prepare prompt for OpenAI
    const countryInfo = COUNTRIES.find(c => c.value === country);
    const countryName = countryInfo ? countryInfo.label : country;
    const languageName = getLanguageName(language);
    
    const systemMessage = `You are an expert brand analyst who creates comprehensive brand identity profiles. 
Your analysis is clear, professional, and tailored to the specific brand and region.
CRITICAL: Your entire response MUST be in the language specified by the user (${languageName}).
Do not include any content in English unless the specified language is English.`;
    
    const userMessage = `Create a comprehensive brand identity profile for "${name}" based on the following website content:
    
${contents.map((content, i) => `URL ${i+1}: ${validUrls[i]}\n${content.substring(0, 500)}...\n`).join('\n')}

The brand operates in ${countryName} and communicates in ${languageName}.

IMPORTANT: Generate ALL content in ${languageName}. The entire response must be written in this language, appropriate for the market in ${countryName}. 
DO NOT use English for any part of your response unless the requested language is English.

Please provide the following elements:

1. BRAND IDENTITY: A detailed paragraph describing the brand's personality, values, and mission as they would be perceived in ${countryName}. (100-150 words)

2. TONE OF VOICE: A description of how the brand communicates in ${languageName} - formal/casual, technical/accessible, etc. Consider cultural norms and communication styles in ${countryName}. (50-75 words)

3. CONTENT GUARDRAILS: 5 specific guidelines that content creators must follow when creating content for this brand in ${countryName}. Format as bullet points.

4. SUGGESTED AGENCIES: 10 regulatory bodies or vetting agencies relevant to this brand in ${countryName}. Include a mix of general and industry-specific organizations. For each agency, include their name, a brief description, and priority level (high/medium/low).

5. BRAND COLOR: Suggest a primary brand color in hex format (e.g., #FF5733) that would resonate well with consumers in ${countryName}.

Format your response as a structured JSON object with these keys: brandIdentity, toneOfVoice, guardrails, suggestedAgencies (as an array of objects with name, description, and priority), and brandColor.
Remember that ALL text fields must be written in ${languageName}, not English.`;
    
    try {
      const modelToUse = process.env.AZURE_OPENAI_DEPLOYMENT || process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
      const completionResponse = await openai.chat.completions.create({
        model: modelToUse,
        messages: [{ role: "system", content: systemMessage }, { role: "user", content: userMessage }],
        max_tokens: 1500, // Increased max_tokens for potentially longer agency lists
        temperature: 0.7,
        response_format: { type: "json_object" }, // Request JSON output
      });
      
      const completion = completionResponse.choices[0]?.message?.content;
      if (!completion) throw new Error('No completion received from AI service.');
      
      let jsonData;
      try {
        jsonData = JSON.parse(completion);
      } catch (e) {
        // Log this parsing error securely on server-side in production
        throw new Error('AI service returned malformed JSON. Please try again.');
      }
      
      // Validate and structure the result - remove defaults for missing fields
      const result = {
        brandIdentity: jsonData.brandIdentity,
        toneOfVoice: jsonData.toneOfVoice,
        guardrails: jsonData.guardrails,
        suggestedAgencies: Array.isArray(jsonData.suggestedAgencies) ? jsonData.suggestedAgencies : [],
        brandColor: (jsonData.brandColor && /^#[0-9A-Fa-f]{6}$/.test(jsonData.brandColor)) ? jsonData.brandColor : null,
        // usedFallback: false, // This flag is no longer relevant
      };
      
      // Ensure all expected fields are present, even if null, to maintain consistent structure
      const requiredKeys = ['brandIdentity', 'toneOfVoice', 'guardrails', 'suggestedAgencies', 'brandColor'];
      for (const key of requiredKeys) {
        if (!(key in result) || result[key as keyof typeof result] === undefined) {
          (result as any)[key] = null; // Set to null if undefined or missing
        }
      }

      return NextResponse.json({ success: true, data: result });
      
    } catch (aiError) {
      // AI call or parsing failed. This will be handled by the outer catch block.
      throw aiError; 
    }
    
  } catch (error) {
    // All console.errors removed, handleApiError will manage the response.
    // The custom error message logic in handleApiError can be enhanced if needed for AI specific public messages.
    return handleApiError(error, 'Failed to process brand identity request');
  }
}); 