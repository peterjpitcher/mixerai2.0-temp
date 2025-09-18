import { NextRequest, NextResponse } from 'next/server';
import { generateMetadata } from '@/lib/azure/openai';
import { fetchWebPageContent } from '@/lib/utils/web-scraper';
import { handleApiError } from '@/lib/api-utils'; // Import for consistent error handling
// import { withAuth } from '@/lib/auth/api-auth'; // No longer used
import { withAdminAuthAndCSRF } from '@/lib/auth/api-auth'; // Use withAdminAuthAndCSRF

const testsEnabled = process.env.ENABLE_TEST_ENDPOINTS === 'true';

function disabledResponse() {
  return NextResponse.json(
    { success: false, error: 'This test endpoint is disabled. Set ENABLE_TEST_ENDPOINTS=true to enable locally.' },
    { status: 410 }
  );
}
import { User } from '@supabase/supabase-js';

// WARNING: This is a test endpoint that allows calls to Azure OpenAI services.
// It is now protected by admin-only authorization.
// It should be REMOVED or STRICTLY SECURED before any deployment to non-local environments.

interface MetadataGenerationRequest {
  url: string;
  brandId: string; // Note: brandId is required but not used to fetch live brand data in this test route.
  brandLanguage?: string;
  brandCountry?: string;
  brandIdentity?: string;
  toneOfVoice?: string;
  guardrails?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const POST = withAdminAuthAndCSRF(async (request: NextRequest, _user: User) => {
  if (!testsEnabled) {
    return disabledResponse();
  }
  // console.log removed
  try {
    const data: MetadataGenerationRequest = await request.json();
    
    if (!data.url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    if (!data.brandId) {
      // brandId is required by the interface but not strictly needed for this test endpoint's logic
      // as it uses defaults. However, keeping the check for consistency with the main tool.
      return NextResponse.json(
        { success: false, error: 'Brand ID is required (though not used for DB fetch in this test route)' },
        { status: 400 }
      );
    }
    
    try {
      new URL(data.url);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }
    
    // Using defaults for brand context in this test route
    const brandLanguage = data.brandLanguage || 'en';
    const brandCountry = data.brandCountry || 'GB'; // Defaulting to GB for test
    const brandIdentity = data.brandIdentity || 'A generic test brand focused on clarity.';
    const toneOfVoice = data.toneOfVoice || 'Neutral and informative.';
    const guardrails = data.guardrails || 'Keep content factual and brief.';
    
    // console.log removed
    
    let pageContent = '';
    try {
      pageContent = await fetchWebPageContent(data.url);
      // console.log removed
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_fetchError) {
      // console.warn removed. Proceeding without pageContent is acceptable for this test.
    }
    
    // console.log removed
    const generatedMetadata = await generateMetadata(
      data.url,
      brandLanguage,
      brandCountry,
      {
        brandIdentity,
        toneOfVoice,
        guardrails,
        pageContent
      }
    );
    
    // console.log removed
    // Note: The validateMetadata function is defined below but NOT called in this test route.
    // The main tool at /api/tools/metadata-generator DOES call it.

    return NextResponse.json({
      success: true,
      url: data.url,
      ...generatedMetadata,
      keywords: [] // Retained for now
    });
  } catch (error: unknown) {
    // console.error removed
    // Simplified error handling for this test route
    return handleApiError(error, 'Test metadata generation failed');
  }
});

// Function to validate metadata length requirements (copied from main tool, but not used in this test route)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function validateMetadata(metaTitle: string, metaDescription: string): { 
  isValid: boolean; 
  reason?: string;
  titleLength?: number;
  descriptionLength?: number;
} {
  const cleanTitle = (metaTitle || "").replace(/\s*\(\d+\s*chars?\)$/i, "");
  const cleanDescription = (metaDescription || "").replace(/\s*\(\d+\s*chars?\)$/i, "");
  
  const titleLength = cleanTitle?.length || 0;
  const descriptionLength = cleanDescription?.length || 0;
  
  if (titleLength < 45 || titleLength > 60) {
    return { 
      isValid: false, 
      reason: `Meta title length (${titleLength}) is outside the allowed range (45-60 characters). Note that CMS will append brand name.`,
      titleLength,
      descriptionLength
    };
  }
  
  if (descriptionLength < 150 || descriptionLength > 160) {
    return { 
      isValid: false, 
      reason: `Meta description length (${descriptionLength}) is outside the required range (150-160 characters)`,
      titleLength,
      descriptionLength
    };
  }
  
  return { isValid: true, titleLength, descriptionLength };
} 
