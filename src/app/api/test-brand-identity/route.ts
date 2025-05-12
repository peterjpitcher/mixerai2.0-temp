import { NextRequest, NextResponse } from 'next/server';
import { generateBrandIdentityFromUrls } from '@/lib/azure/openai';
// import { withAuth } from '@/lib/auth/api-auth'; // No longer used
import { withAdminAuth } from '@/lib/auth/api-auth'; // Use withAdminAuth
import { handleApiError } from '@/lib/api-utils';

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
 * API route to test field mapping between the brand identity generation and frontend.
 * NOTE: This test endpoint is admin-only.
 */
export const GET = withAdminAuth(async (request: NextRequest, user) => {
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
    
    // Generate a sample brand identity
    const result = await generateBrandIdentityFromUrls("Test Brand", ["https://example.com"]);
    
    // Create the final response object that will be sent to the frontend
    const apiResponse = {
      success: true,
      data: {
        brandIdentity: result.brandIdentity || "",
        toneOfVoice: result.toneOfVoice || "",
        guardrails: result.guardrails || "",
        vettingAgencies: result.suggestedAgencies || [],
        brandColor: result.brandColor
      }
    };
    
    return NextResponse.json({
      success: true,
      original: result,
      final: apiResponse,
      mappingExplanation: {
        "result.brandIdentity → apiResponse.data.brandIdentity": "Direct mapping",
        "result.toneOfVoice → apiResponse.data.toneOfVoice": "Direct mapping",
        "result.guardrails → apiResponse.data.guardrails": "Direct mapping",
        "result.suggestedAgencies → apiResponse.data.vettingAgencies": "Important! Field name changes from suggestedAgencies to vettingAgencies",
        "result.brandColor → apiResponse.data.brandColor": "Direct mapping"
      }
    });
  } catch (error: any) {
    return handleApiError(error, 'Test brand identity generation failed');
  }
}); 