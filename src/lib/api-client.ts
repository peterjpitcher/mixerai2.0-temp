/**
 * API Client with built-in CSRF protection
 * 
 * This module provides a fetch wrapper that automatically includes
 * CSRF tokens for state-changing operations.
 */

/**
 * Get CSRF token from cookies
 */
function getCSRFToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  // Use regex to extract csrf-token from cookie string
  const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
  if (csrfMatch && csrfMatch[1]) {
    return csrfMatch[1];
  }
  
  // Fallback: split and parse cookies manually
  const cookies = document.cookie.split(';');
  
  for (const cookie of cookies) {
    const trimmedCookie = cookie.trim();
    const [name, value] = trimmedCookie.split('=');
    
    if (name === 'csrf-token' && value) {
      return value;
    }
  }
  
  return null;
}

/**
 * Enhanced fetch that automatically includes CSRF token for protected methods
 * 
 * Usage: Same as regular fetch, but CSRF token is automatically included
 * 
 * @example
 * // Instead of fetch('/api/brands', { method: 'POST', ... })
 * // Use:
 * const response = await apiFetch('/api/brands', { 
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * });
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = init?.method?.toUpperCase() || 'GET';
  const headers = new Headers(init?.headers);
  
  // Add CSRF token for state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken);
    }
  }
  
  // Ensure JSON content type for JSON bodies
  if (init?.body && typeof init.body === 'string' && !headers.has('content-type')) {
    try {
      JSON.parse(init.body);
      headers.set('content-type', 'application/json');
    } catch {
      // Not JSON, don't set content-type
    }
  }
  
  return fetch(input, {
    ...init,
    headers,
    credentials: 'include'
  });
}

/**
 * Convenience methods for common HTTP operations
 */
export const apiClient = {
  get: (url: string, options?: RequestInit) => 
    apiFetch(url, { ...options, method: 'GET' }),
    
  post: (url: string, body?: unknown, options?: RequestInit) => 
    apiFetch(url, { 
      ...options, 
      method: 'POST', 
      body: typeof body === 'string' ? body : JSON.stringify(body) 
    }),
    
  put: (url: string, body?: unknown, options?: RequestInit) => 
    apiFetch(url, { 
      ...options, 
      method: 'PUT', 
      body: typeof body === 'string' ? body : JSON.stringify(body) 
    }),
    
  patch: (url: string, body?: unknown, options?: RequestInit) => 
    apiFetch(url, { 
      ...options, 
      method: 'PATCH', 
      body: typeof body === 'string' ? body : JSON.stringify(body) 
    }),
    
  delete: (url: string, options?: RequestInit) => 
    apiFetch(url, { ...options, method: 'DELETE' })
};