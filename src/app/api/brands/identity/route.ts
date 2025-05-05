import { NextRequest, NextResponse } from 'next/server';
import { generateBrandIdentityFromUrls } from '@/lib/azure/openai';

// Simple in-memory rate limiting
const rateLimit = new Map<string, { count: number, timestamp: number }>();
const RATE_LIMIT_PERIOD = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5; // 5 requests per minute

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    
    // Check rate limit
    const now = Date.now();
    const rateData = rateLimit.get(ip) || { count: 0, timestamp: now };
    
    // Reset count if period has passed
    if (now - rateData.timestamp > RATE_LIMIT_PERIOD) {
      rateData.count = 0;
      rateData.timestamp = now;
    }
    
    // Check if rate limit exceeded
    if (rateData.count >= MAX_REQUESTS) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }
    
    // Increment request count
    rateData.count++;
    rateLimit.set(ip, rateData);
    
    const body = await req.json();
    const { brandName, urls, countryCode, languageCode } = body;
    
    console.log("Received brand identity generation request:", { brandName, urls, countryCode, languageCode });
    
    if (!brandName || !urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { success: false, error: "Brand name and at least one URL are required" },
        { status: 400 }
      );
    }
    
    // Validate URLs
    const validUrls = urls.filter(url => {
      try {
        new URL(url);
        return true;
      } catch (e) {
        return false;
      }
    });
    
    if (validUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid URLs provided" },
        { status: 400 }
      );
    }
    
    // Get brand identity
    const result = await generateBrandIdentityFromUrls(brandName, validUrls);
    
    // Validate the result to ensure all fields are present
    if (!result.brandIdentity) console.warn("Warning: Brand identity is missing or empty");
    if (!result.toneOfVoice) console.warn("Warning: Tone of voice is missing or empty");
    if (!result.guardrails) console.warn("Warning: Guardrails are missing or empty");
    if (!result.brandColor) console.warn("Warning: Brand color is missing or empty");
    
    if (!result.suggestedAgencies || !Array.isArray(result.suggestedAgencies)) {
      console.warn("Warning: Suggested agencies are missing or not an array");
    } else if (result.suggestedAgencies.length === 0) {
      console.warn("Warning: Suggested agencies array is empty");
    }
    
    // Log the full response for debugging
    console.log("Final brand identity result:", {
      brandIdentity: result.brandIdentity?.substring(0, 50) + "...",
      toneOfVoice: result.toneOfVoice?.substring(0, 50) + "...",
      guardrails: result.guardrails?.substring(0, 50) + "...",
      suggestedAgenciesCount: result.suggestedAgencies?.length || 0,
      brandColor: result.brandColor
    });
    
    return NextResponse.json({
      success: true,
      data: {
        brandIdentity: result.brandIdentity || "",
        toneOfVoice: result.toneOfVoice || "",
        guardrails: result.guardrails || "",
        vettingAgencies: result.suggestedAgencies || [],
        brandColor: result.brandColor || "#3498db" // Provide a default color if missing
      }
    });
  } catch (error: any) {
    console.error('Error generating brand identity:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate brand identity',
        message: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 