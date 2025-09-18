import { NextRequest, NextResponse } from 'next/server';
import { withAuthMonitoringAndCSRF } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import dns from 'dns';
import ipaddr from 'ipaddr.js'; // Using ipaddr.js for robust IP checking
import { env } from '@/lib/env';

const MAX_RESPONSE_SIZE = 1024 * 1024; // 1MB
const allowedContentPrefixes = ['text/', 'application/json', 'application/xml'];

const rawAllowlist = (env.PROXY_ALLOWED_HOSTS || '')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

const allowlistedHosts = new Set(rawAllowlist);

function isHostAllowlisted(hostname: string): boolean {
  if (!allowlistedHosts.size) {
    return false;
  }

  const host = hostname.toLowerCase();

  for (const entry of allowlistedHosts) {
    if (entry.startsWith('*.')) {
      const bare = entry.slice(2);
      if (host === bare || host.endsWith(`.${bare}`)) {
        return true;
      }
      continue;
    }

    if (host === entry) {
      return true;
    }
  }

  return false;
}

export const dynamic = "force-dynamic";

/**
 * GET endpoint acting as an HTTP proxy.
 * IMPORTANT: This proxy can make requests from the server to any URL specified by an authenticated user.
 * This poses a Server-Side Request Forgery (SSRF) risk.
 * MITIGATION: Basic SSRF protection implemented by blocking requests to private/reserved IP ranges.
 * RECOMMENDATION: For enhanced security, replace this basic check with a strict allowlist of permitted target domains/protocols.
 */
export const GET = withAuthMonitoringAndCSRF(async (request: NextRequest) => {
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
    } catch {
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

    if (!isHostAllowlisted(parsedUrl.hostname)) {
      console.warn('[proxy] Blocked request to non-allowlisted host', parsedUrl.hostname);
      return NextResponse.json(
        {
          success: false,
          error: 'Requests to this host are not permitted. Please contact an administrator to allowlist the domain.'
        },
        { status: 403 }
      );
    }

    // Resolve hostname to IP address and ensure no private ranges
    try {
      const lookupResults = await dns.promises.lookup(parsedUrl.hostname, { all: true });
      if (!lookupResults.length) {
        return NextResponse.json(
          { success: false, error: `Could not resolve hostname: ${parsedUrl.hostname}` },
          { status: 502 }
        );
      }

      for (const result of lookupResults) {
        const addr = ipaddr.parse(result.address);
        const ipRange = addr.range();

        if (ipRange === 'private' || ipRange === 'loopback' || ipRange === 'reserved' || ipRange === 'linkLocal' || ipRange === 'uniqueLocal') {
          console.warn(`Blocked proxy request to internal IP: ${result.address} (${parsedUrl.hostname})`);
          return NextResponse.json(
            { success: false, error: 'Requests to internal or reserved IP addresses are not allowed' },
            { status: 403 }
          );
        }
      }
    } catch (dnsError) {
      console.error(`DNS lookup failed for ${parsedUrl.hostname}:`, dnsError);
      return NextResponse.json(
        { success: false, error: `Could not resolve hostname: ${parsedUrl.hostname}` },
        { status: 502 }
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
    const isAllowedContent = allowedContentPrefixes.some(prefix => contentType.toLowerCase().startsWith(prefix));
    if (!isAllowedContent) {
      return NextResponse.json(
        { success: false, error: `Content type ${contentType} is not allowed through this proxy.` },
        { status: 415 }
      );
    }

    const contentLengthHeader = response.headers.get('content-length');
    if (contentLengthHeader) {
      const numericLength = Number(contentLengthHeader);
      if (!Number.isNaN(numericLength) && numericLength > MAX_RESPONSE_SIZE) {
        return NextResponse.json(
          { success: false, error: 'The requested resource is too large to proxy.' },
          { status: 413 }
        );
      }
    }

    // Stream response with size cap
    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json(
        { success: false, error: 'Unable to read proxied response body.' },
        { status: 502 }
      );
    }

    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalSize += value.byteLength;
      if (totalSize > MAX_RESPONSE_SIZE) {
        reader.cancel();
        return NextResponse.json(
          { success: false, error: 'The requested resource is too large to proxy.' },
          { status: 413 }
        );
      }
      chunks.push(value);
    }

    const concatenated = concatenateUint8Arrays(chunks, totalSize);
    const text = new TextDecoder('utf-8').decode(concatenated);
    
    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (error) {
     if (error instanceof Error && error.name === 'TimeoutError') {
        return NextResponse.json(
            { success: false, error: 'Request to the target URL timed out after 10 seconds.' },
            { status: 504 } // Gateway Timeout
        );
    }
    return handleApiError(error, 'Failed to proxy request');
  }
}); 

function concatenateUint8Arrays(chunks: Uint8Array[], totalLength: number): Uint8Array {
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
