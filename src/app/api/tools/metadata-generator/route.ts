import { NextRequest, NextResponse } from 'next/server';
import { generateMetadata } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { fetchWebPageContent } from '@/lib/utils/web-scraper';
import { handleApiError } from '@/lib/api-utils';

// In-memory rate limiting
const rateLimit = new Map<string, { count: number, timestamp: number }>();
const RATE_LIMIT_PERIOD = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 10; // Allow 10 requests per minute per IP

interface MetadataGenerationRequest {
  urls: string[];
  language?: string;
}

// Define the result item type matching the frontend
interface MetadataResultItem {
  url: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  error?: string;
}

// Temporarily expose a direct handler for testing
// export async function POST(request: NextRequest) { ... } // Content of this function is removed for brevity

// Keep the original authenticated route - RENAMING to POST
export const POST = withAuthAndMonitoring(async (request: NextRequest, user) => {
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
      console.warn(`[RateLimit] Blocked ${ip} for metadata-generator. Count: ${userRateLimit.count}`);
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
    const data: MetadataGenerationRequest = await request.json();
    
    if (!data.urls || !Array.isArray(data.urls) || data.urls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'An array of URLs is required' },
        { status: 400 }
      );
    }

    const results: MetadataResultItem[] = [];
    const requestedLanguage = data.language || 'en';

    for (const url of data.urls) {
      try {
        new URL(url);

        const brandCountry = 'US';
        const brandContext = {
          brandIdentity: '',
          toneOfVoice: '',
          guardrails: '',
        };
        
        let pageContent = '';
        try {
          pageContent = await fetchWebPageContent(url);
        } catch (fetchError) {
          console.warn(`[MetadataGen] Failed to fetch content for URL ${url}: ${(fetchError as Error).message}`);
        }
        
        console.log(`[Delay] Metadata Gen: Waiting 5 seconds before AI call for ${url}...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log(`[Delay] Metadata Gen: Finished 5-second wait. Calling AI for ${url}...`);

        const generatedMetadata: any = await generateMetadata(
          url,
          requestedLanguage,
          brandCountry,
          {
            ...brandContext,
            pageContent
          }
        );
        
        results.push({
          url,
          metaTitle: generatedMetadata.metaTitle,
          metaDescription: generatedMetadata.metaDescription,
          keywords: generatedMetadata.keywords && Array.isArray(generatedMetadata.keywords) ? generatedMetadata.keywords : [],
        });

      } catch (error: any) {
        console.error(`[MetadataGen] Error processing URL ${url}:`, error);
        results.push({
          url,
          error: error.message || 'Failed to generate metadata for this URL.',
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      userId: user.id,
      results,
    });
  } catch (error: any) {
    return handleApiError(error, 'Metadata Generation Error', 500);
  }
}); 