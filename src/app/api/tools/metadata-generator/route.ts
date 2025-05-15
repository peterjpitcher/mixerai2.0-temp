import { NextRequest, NextResponse } from 'next/server';
import { generateMetadata } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { fetchWebPageContent } from '@/lib/utils/web-scraper';
import { handleApiError } from '@/lib/api-utils';

interface MetadataGenerationRequest {
  urls: string[];
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
  try {
    const data: MetadataGenerationRequest = await request.json();
    
    if (!data.urls || !Array.isArray(data.urls) || data.urls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'An array of URLs is required' },
        { status: 400 }
      );
    }

    const results: MetadataResultItem[] = [];

    for (const url of data.urls) {
      try {
        new URL(url);

        const brandLanguage = 'en';
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
        
        const generatedMetadata: any = await generateMetadata(
          url,
          brandLanguage,
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