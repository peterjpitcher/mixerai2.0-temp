import { NextResponse } from 'next/server';
import { generateBrandIdentityFromUrls } from '@/lib/azure/openai';

/**
 * API route to test field mapping between the brand identity generation and frontend
 */
export async function GET() {
  try {
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