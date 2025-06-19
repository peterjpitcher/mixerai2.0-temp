/**
 * Get client IP address from various sources
 * Works in both client and server environments
 */
export async function getClientIP(): Promise<string> {
  // Client-side: Try to get IP from a public API
  if (typeof window !== 'undefined') {
    try {
      // Use a simple IP API service
      const response = await fetch('https://api.ipify.org?format=json');
      if (response.ok) {
        const data = await response.json();
        return data.ip || 'unknown';
      }
    } catch (error) {
      console.error('Failed to fetch client IP:', error);
    }
    return 'unknown';
  }

  // Server-side: This would typically be handled by middleware
  // Since this is client-side component, we'll return unknown
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