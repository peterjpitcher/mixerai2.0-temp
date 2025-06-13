import { NextRequest, NextResponse } from 'next/server';
import { generateBrandIdentityFromUrls } from '@/lib/azure/openai';
// import { withAuth } from '@/lib/auth/api-auth'; // No longer used
import { withAdminAuth } from '@/lib/auth/api-auth'; // Use withAdminAuth
import { handleApiError } from '@/lib/api-utils';

export const dynamic = "force-dynamic";

// Detect if we're in a build environment (Vercel)
const isBuildEnvironment = process.env.VERCEL_ENV === 'production' || 
                           process.env.NEXT_PHASE === 'phase-production-build';

// Mock response for build-time requests to avoid API calls during build
const mockResponse = {
  brandIdentity: "This is a mock brand identity for Test Brand, generated during build.",
  toneOfVoice: "Professional, friendly, and authoritative. The brand speaks with clarity and expertise.",
  guardrails: "- Only use professional language\n- Avoid controversial topics\n- Focus on quality and reliability\n- Use inclusive language\n- Maintain consistent brand messaging",
  suggestedAgencies: [
    {name: "ASA", description: "Advertising Standards Authority", priority: "high"},
    {name: "FTC", description: "Federal Trade Commission", priority: "medium"},
    {name: "NAD", description: "National Advertising Division", priority: "low"}
  ],
  brandColor: "#4285F4"
};

/**
 * Test endpoint to verify Azure OpenAI Brand Identity Prompt functionality
 * Admin only
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAdminAuth(async (_request: NextRequest, _user) => {
  try {
    // Check if we're in a build environment and use mock data
    if (isBuildEnvironment) {
      return NextResponse.json({
        success: true,
        original: mockResponse,
        final: {
          success: true,
          data: {
            brandIdentity: mockResponse.brandIdentity,
            toneOfVoice: mockResponse.toneOfVoice,
            guardrails: mockResponse.guardrails,
            vettingAgencies: mockResponse.suggestedAgencies,
            brandColor: mockResponse.brandColor
          }
        },
        mockData: true,
        mappingExplanation: {
          "result.brandIdentity → apiResponse.data.brandIdentity": "Direct mapping",
          "result.toneOfVoice → apiResponse.data.toneOfVoice": "Direct mapping",
          "result.guardrails → apiResponse.data.guardrails": "Direct mapping",
          "result.suggestedAgencies → apiResponse.data.vettingAgencies": "Important! Field name changes from suggestedAgencies to vettingAgencies",
          "result.brandColor → apiResponse.data.brandColor": "Direct mapping"
        }
      });
    }
    
    // This is a test route, so we'll use hardcoded values for simplicity
    const testBrandName = "Test Brand";
    const testUrls = ["https://www.mixerai.com"];
    const testLanguage = "en";
    const testCountry = "US";

    console.log(`GET /api/test-brand-identity: Testing with Brand: ${testBrandName}, URL: ${testUrls[0]}, Lang: ${testLanguage}, Country: ${testCountry}`);
    
    const identityData = await generateBrandIdentityFromUrls(
      testBrandName, 
      testUrls,
      testLanguage, 
      testCountry
    );
    
    console.log("Brand identity GET test successful:", identityData);
    
    return NextResponse.json({
      success: true,
      message: "GET test successful. Fetched brand identity with hardcoded values.",
      data: identityData
    });
  } catch (error: unknown) {
    return handleApiError(error, 'Test brand identity generation failed');
  }
}); 