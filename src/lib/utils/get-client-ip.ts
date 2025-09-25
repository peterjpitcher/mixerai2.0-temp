/**
 * Get client IP address from various sources
 * Works in both client and server environments
 */
declare global {
  interface Window {
    __CLIENT_IP__?: string;
  }
}

export async function getClientIP(): Promise<string> {
  if (typeof window !== 'undefined') {
    const hintedIp = typeof window.__CLIENT_IP__ === 'string' ? window.__CLIENT_IP__.trim() : '';
    return hintedIp || 'unknown';
  }

  return 'unknown';
}

/**
 * Parse IP from request headers (for server-side use)
 */
export function getIPFromHeaders(headers: Headers): string {
  // Check various headers in order of preference
  const headerNames = [
    'x-real-ip',
    'x-forwarded-for',
    'x-client-ip',
    'x-cluster-client-ip',
    'cf-connecting-ip', // Cloudflare
    'fastly-client-ip', // Fastly
    'true-client-ip', // Akamai and Cloudflare
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ];

  for (const headerName of headerNames) {
    const value = headers.get(headerName);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim();
      if (ip && ip !== 'unknown') {
        return ip;
      }
    }
  }

  return 'unknown';
}
