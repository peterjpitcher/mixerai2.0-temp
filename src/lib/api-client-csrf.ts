/**
 * API Client with CSRF Token Support
 * 
 * This module provides fetch wrappers that automatically include CSRF tokens
 * for state-changing operations (POST, PUT, DELETE, PATCH).
 */

/**
 * Get CSRF token from cookie
 */
function getCSRFToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf-token='))
    ?.split('=')[1];
    
  return token || null;
}

/**
 * Enhanced fetch that automatically includes CSRF token for protected methods
 */
export async function fetchWithCSRF(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method?.toUpperCase() || 'GET';
  const requiresCSRF = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
  
  // Only add CSRF token for state-changing operations
  if (requiresCSRF) {
    const csrfToken = getCSRFToken();
    
    if (!csrfToken) {
      console.warn('[API Client] No CSRF token found in cookies');
    }
    
    options.headers = {
      ...options.headers,
      'x-csrf-token': csrfToken || '',
    };
  }
  
  return fetch(url, options);
}

/**
 * API client with built-in CSRF support
 */
export const apiClient = {
  get: (url: string, options?: RequestInit) => 
    fetchWithCSRF(url, { ...options, method: 'GET' }),
    
  post: (url: string, body?: any, options?: RequestInit) => 
    fetchWithCSRF(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(body),
    }),
    
  put: (url: string, body?: any, options?: RequestInit) => 
    fetchWithCSRF(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(body),
    }),
    
  delete: (url: string, options?: RequestInit) => 
    fetchWithCSRF(url, { ...options, method: 'DELETE' }),
    
  patch: (url: string, body?: any, options?: RequestInit) => 
    fetchWithCSRF(url, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(body),
    }),
};