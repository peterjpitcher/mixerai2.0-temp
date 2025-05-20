import { NextRequest, NextResponse } from 'next/server';
import { generateAltText } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';

// In-memory rate limiting
const rateLimit = new Map<string, { count: number, timestamp: number }>();
const RATE_LIMIT_PERIOD = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 10; // Allow 10 requests per minute per IP

interface AltTextGenerationRequest {
  imageUrls: string[];
  language?: string; // Add language field from request
}

interface AltTextResultItem {
  imageUrl: string;
  altText?: string;
  error?: string;
}

const tldToLangCountry: { [key: string]: { language: string; country: string } } = {
  '.fr': { language: 'fr', country: 'FR' },
  '.de': { language: 'de', country: 'DE' },
  '.es': { language: 'es', country: 'ES' },
  '.it': { language: 'it', country: 'IT' },
  '.co.uk': { language: 'en', country: 'GB' },
  '.com.au': { language: 'en', country: 'AU' },
  '.ca': { language: 'en', country: 'CA' }, // Could also be 'fr'
  '.jp': { language: 'ja', country: 'JP' },
  '.cn': { language: 'zh', country: 'CN' },
  '.nl': { language: 'nl', country: 'NL' },
  '.br': { language: 'pt', country: 'BR' },
  '.ru': { language: 'ru', country: 'RU' },
  '.in': { language: 'en', country: 'IN' },
  // Add more mappings as needed
};

const getDefaultLangCountry = () => ({ language: 'en', country: 'US' });

function getLangCountryFromUrl(imageUrl: string): { language: string; country: string } {
  try {
    // Do not attempt to parse TLD from data URLs
    if (imageUrl.startsWith('data:')) {
      return getDefaultLangCountry();
    }
    const parsedUrl = new URL(imageUrl);
    const hostname = parsedUrl.hostname;

    // Check for multi-part TLDs first (e.g., .co.uk, .com.au)
    for (const tld of Object.keys(tldToLangCountry)) {
      if (hostname.endsWith(tld)) {
        // Check if the part before the TLD is not empty (to avoid matching just .uk from .co.uk on a domain like example.uk)
        const domainPart = hostname.substring(0, hostname.length - tld.length);
        if (domainPart && domainPart.includes('.')) { // Ensure it's a valid subdomain or domain part
            return tldToLangCountry[tld];
        }
      }
    }
    
    // Check for single-part TLDs (e.g., .fr, .de)
    const parts = hostname.split('.');
    if (parts.length > 1) {
      const singleTld = '.' + parts[parts.length - 1];
      if (tldToLangCountry[singleTld]) {
        return tldToLangCountry[singleTld];
      }
    }

  } catch (e) {
    console.warn(`[AltTextLang] Could not parse URL or determine TLD for ${imageUrl}:`, e);
  }
  return getDefaultLangCountry();
}

export const POST = withAuthAndMonitoring(async (request: NextRequest, user) => {
  // Role check: Only Global Admins or Editors can access this tool
  const userRole = user.user_metadata?.role;
  if (!(userRole === 'admin' || userRole === 'editor')) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: You do not have permission to access this tool.' },
      { status: 403 }
    );
  }

  // Rate limiting logic
  const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
  const now = Date.now();

  if (rateLimit.has(ip)) {
    const userRateLimit = rateLimit.get(ip)!;
    if (now - userRateLimit.timestamp > RATE_LIMIT_PERIOD) {
      // Reset count if period has passed
      userRateLimit.count = 1;
      userRateLimit.timestamp = now;
    } else if (userRateLimit.count >= MAX_REQUESTS_PER_MINUTE) {
      console.warn(`[RateLimit] Blocked ${ip} for alt-text-generator. Count: ${userRateLimit.count}`);
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again in a minute.' },
        { status: 429 }
      );
    } else {
      userRateLimit.count += 1;
    }
  } else {
    rateLimit.set(ip, { count: 1, timestamp: now });
  }

  try {
    const data: AltTextGenerationRequest = await request.json();
    
    if (!data.imageUrls || !Array.isArray(data.imageUrls) || data.imageUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'An array of image URLs is required' },
        { status: 400 }
      );
    }

    const results: AltTextResultItem[] = [];

    for (const imageUrl of data.imageUrls) {
      let requestedLanguage = data.language; // Get language from request if provided
      let language = 'en';
      let country = 'US';
      let processingError: string | undefined = undefined;

      try {
        // Validate URL structure before attempting to parse for TLD
        // Data URLs are valid but won't have a TLD for language detection
        if (!imageUrl.startsWith('data:')) {
            new URL(imageUrl);
        }
        
        if (requestedLanguage) {
          language = requestedLanguage;
          // Attempt to map language to a default country, or keep default US
          const langMap = Object.values(tldToLangCountry).find(lc => lc.language === language);
          country = langMap ? langMap.country : 'US'; 
        } else if (!imageUrl.startsWith('data:')) {
          // Fallback to TLD detection if no language explicitly passed and not a data URL
          const langCountry = getLangCountryFromUrl(imageUrl);
          language = langCountry.language;
          country = langCountry.country;
        } else {
          // For data URLs with no language passed, use default
          const defaultLangCountry = getDefaultLangCountry();
          language = defaultLangCountry.language;
          country = defaultLangCountry.country;
        }

      } catch (e: any) {
        console.error(`[AltTextGen] Invalid image URL format for TLD processing: ${imageUrl}:`, e);
        processingError = `Invalid image URL format.`;
        const defaultLangCountry = getDefaultLangCountry();
        language = requestedLanguage || defaultLangCountry.language; // Still prioritize requested lang if URL is bad
        country = defaultLangCountry.country;
      }

      if (processingError) {
        results.push({
          imageUrl,
          error: processingError,
        });
        continue; // Skip to the next URL if the current one is invalid
      }
      
      try {
        // Brand context is currently empty, but kept for potential future use
        const brandContext = {
          brandIdentity: '',
          toneOfVoice: '',
          guardrails: ''
        };
        
        console.log(`[Delay] Alt-Text Gen: Waiting 5 seconds before AI call for ${imageUrl}...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log(`[Delay] Alt-Text Gen: Finished 5-second wait. Calling AI for ${imageUrl}...`);

        // console.log(`[AltTextGen] Generating for ${imageUrl} with lang: ${language}, country: ${country}`);
        const generatedAltTextResult = await generateAltText(
          imageUrl,
          language,
          country,
          brandContext
        );
        
        results.push({
          imageUrl,
          altText: generatedAltTextResult.altText, // Assuming altText is directly on the result
          // error: generatedAltTextResult.error, // If your generateAltText can return partial errors
        });

      } catch (error: any) {
        console.error(`[AltTextGen] Error calling generateAltText for ${imageUrl} (lang: ${language}, country: ${country}):`, error);
        results.push({
          imageUrl,
          error: error.message || 'Failed to generate alt text for this image.',
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      userId: user.id,
      results,
    });

  } catch (error: any) {
    // This outer catch handles errors like request.json() failing or other unexpected issues.
    let errorMessage = 'Failed to process alt text generation request';
    let statusCode = 500;
    
    if (error.message?.includes('OpenAI') || error.message?.includes('Azure') || error.message?.includes('AI service') || (error as any).status === 429) {
      errorMessage = 'The AI service is currently busy or unavailable. Please try again later.';
      statusCode = 503;
    } else {
      errorMessage = error.message || errorMessage;
    }
    return handleApiError(new Error(errorMessage), 'Alt Text Generation Batch Error', statusCode);
  }
}); 