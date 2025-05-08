import { NextResponse } from 'next/server';
import { generateBrandIdentityFromUrls } from '@/lib/azure/openai';

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
 * API route to test field mapping between the brand identity generation and frontend
 */
export async function GET() {
  try {
    // Check if we're in a build environment and use mock data
    if (isBuildEnvironment) {
      console.log("Build environment detected - using mock brand identity data");
      
      // Return a successful mock response
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
        brandColor: result.brandColor || "#3498db" // Default blue color
      }
    };
    
    // Debug logs
    console.log("Field Mapping Test:");
    console.log("Original result object:", {
      brandIdentity: result.brandIdentity?.substring(0, 20) + "...",
      toneOfVoice: result.toneOfVoice?.substring(0, 20) + "...",
      guardrails: result.guardrails?.substring(0, 20) + "...",
      suggestedAgencies: Array.isArray(result.suggestedAgencies) 
        ? `[${result.suggestedAgencies.length} agencies]` 
        : typeof result.suggestedAgencies,
      brandColor: result.brandColor,
    });
    
    console.log("Transformed to API response:", {
      success: apiResponse.success,
      data: {
        brandIdentity: apiResponse.data.brandIdentity?.substring(0, 20) + "...",
        toneOfVoice: apiResponse.data.toneOfVoice?.substring(0, 20) + "...",
        guardrails: apiResponse.data.guardrails?.substring(0, 20) + "...",
        vettingAgencies: Array.isArray(apiResponse.data.vettingAgencies) 
          ? `[${apiResponse.data.vettingAgencies.length} agencies]` 
          : typeof apiResponse.data.vettingAgencies,
        brandColor: apiResponse.data.brandColor,
      }
    });
    
    // Return both the original result and final response for comparison
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
    console.error("Error in test brand identity API:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test failed', 
        message: error.message 
      }, 
      { status: 500 }
    );
  }
} 