import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';

/**
 * GET endpoint acting as an HTTP proxy.
 * IMPORTANT: This proxy can make requests from the server to any URL specified by an authenticated user.
 * This poses a Server-Side Request Forgery (SSRF) risk if not properly restricted.
 * RECOMMENDATION: Implement a strict allowlist of target domains/protocols if this proxy is for specific known services.
 * If for general user-provided URLs, consider adding restrictions to prevent requests to internal/private IP ranges.
 */
export const GET = withAuthAndMonitoring(async (request: NextRequest) => {
  try {
    const urlToProxy = request.nextUrl.searchParams.get('url');
    
    if (!urlToProxy) {
      return NextResponse.json(
        { success: false, error: 'URL parameter is required' },
        { status: 400 }
      );
    }
    
    try {
      new URL(urlToProxy);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format provided' },
        { status: 400 }
      );
    }
    
    const response = await fetch(urlToProxy, {
      headers: {
        'User-Agent': 'MixerAI/1.0',
      },
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to fetch the requested URL. Upstream server responded with: ${response.status} ${response.statusText}` 
        },
        { status: response.status }
      );
    }
    
    const contentType = response.headers.get('content-type') || 'text/plain';
    const body = await response.text();
    
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (error) {
    return handleApiError(error, 'Failed to proxy request');
  }
}); 