import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';

export const GET = withAuthAndMonitoring(async (request: NextRequest) => {
  try {
    // Get the URL parameter
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL parameter is required' },
        { status: 400 }
      );
    }
    
    console.log(`Proxying request to: ${url}`);
    
    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }
    
    // Fetch the URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MixerAI/1.0',
      },
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to fetch URL: ${response.status} ${response.statusText}` 
        },
        { status: response.status }
      );
    }
    
    // Get content type from response
    const contentType = response.headers.get('content-type') || 'text/plain';
    
    // Get the response body
    const body = await response.text();
    
    // Return the response with appropriate content type
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (error) {
    console.error('Error in proxy endpoint:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to proxy request: ${error instanceof Error ? error.message : String(error)}` 
      },
      { status: 500 }
    );
  }
}); 