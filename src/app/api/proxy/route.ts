import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import dns from 'dns';
import ipaddr from 'ipaddr.js'; // Using ipaddr.js for robust IP checking

export const dynamic = "force-dynamic";

/**
 * GET endpoint acting as an HTTP proxy.
 * IMPORTANT: This proxy can make requests from the server to any URL specified by an authenticated user.
 * This poses a Server-Side Request Forgery (SSRF) risk.
 * MITIGATION: Basic SSRF protection implemented by blocking requests to private/reserved IP ranges.
 * RECOMMENDATION: For enhanced security, replace this basic check with a strict allowlist of permitted target domains/protocols.
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
    
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(urlToProxy);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format provided' },
        { status: 400 }
      );
    }

    // --- SSRF Mitigation Start ---
    // Restrict protocols to http and https
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json(
        { success: false, error: 'Invalid protocol. Only HTTP and HTTPS are allowed.' },
        { status: 400 }
      );
    }

    // Resolve hostname to IP address
    let resolvedIp: string;
    try {
      const lookupResult = await dns.promises.lookup(parsedUrl.hostname);
      resolvedIp = lookupResult.address;
    } catch (dnsError: any) {
      console.error(`DNS lookup failed for ${parsedUrl.hostname}:`, dnsError);
      return NextResponse.json(
        { success: false, error: `Could not resolve hostname: ${parsedUrl.hostname}` },
        { status: 502 } // Bad Gateway seems appropriate here
      );
    }

    // Check if the resolved IP is private, loopback, or reserved
    const addr = ipaddr.parse(resolvedIp);
    const ipRange = addr.range();

    if (ipRange === 'private' || ipRange === 'loopback' || ipRange === 'reserved') {
        console.warn(`Blocked proxy request to potentially internal IP: ${resolvedIp} (${parsedUrl.hostname})`);
        return NextResponse.json(
            { success: false, error: 'Requests to internal or reserved IP addresses are not allowed' },
            { status: 403 } // Forbidden
        );
    }
    // --- SSRF Mitigation End ---
    
    const response = await fetch(urlToProxy, {
      headers: {
        'User-Agent': 'MixerAI/1.0',
      },
      // Add a timeout to prevent long-hanging requests
      signal: AbortSignal.timeout(10000) // 10 seconds timeout
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
  } catch (error: any) {
     if (error.name === 'TimeoutError') {
        return NextResponse.json(
            { success: false, error: 'Request to the target URL timed out after 10 seconds.' },
            { status: 504 } // Gateway Timeout
        );
    }
    return handleApiError(error, 'Failed to proxy request');
  }
}); 