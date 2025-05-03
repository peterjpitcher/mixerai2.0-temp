import { NextRequest, NextResponse } from 'next/server';
import { generateBrandIdentityFromUrls } from '@/lib/azure/openai';

// Rate limiting
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

// Simple rate limiting tracker
const rateLimit = new Map<string, { count: number, resetAt: number }>();

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Check rate limit
    const now = Date.now();
    const rateData = rateLimit.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
    
    // Reset if window expired
    if (rateData.resetAt < now) {
      rateData.count = 0;
      rateData.resetAt = now + RATE_LIMIT_WINDOW;
    }
    
    // Check if limit exceeded
    if (rateData.count >= MAX_REQUESTS_PER_WINDOW) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded. Please try again later.' 
        },
        { status: 429 }
      );
    }
    
    // Update rate limit
    rateData.count += 1;
    rateLimit.set(ip, rateData);
    
    // Parse request body
    const { brandName, urls } = await request.json();
    
    // Validate request data
    if (!brandName || !urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Brand name and at least one URL are required' 
        },
        { status: 400 }
      );
    }
    
    // Validate URLs
    const invalidUrls = urls.filter(url => !isValidUrl(url));
    if (invalidUrls.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid URLs: ${invalidUrls.join(', ')}` 
        },
        { status: 400 }
      );
    }
    
    // Generate brand identity
    const brandIdentity = await generateBrandIdentityFromUrls(brandName, urls);
    
    return NextResponse.json({
      success: true,
      data: brandIdentity
    });
    
  } catch (error: any) {
    console.error('Error generating brand identity:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to generate brand identity' 
      },
      { status: 500 }
    );
  }
} 