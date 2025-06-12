'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to get CSRF token from cookie for API requests
 * 
 * Usage:
 * const csrfToken = useCSRFToken();
 * 
 * Then include in API requests:
 * fetch('/api/...', {
 *   headers: {
 *     'x-csrf-token': csrfToken
 *   }
 * })
 */
export function useCSRFToken(): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get CSRF token from cookies
    const getCookie = (name: string): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        return parts.pop()?.split(';').shift() || null;
      }
      return null;
    };

    const csrfToken = getCookie('csrf-token');
    setToken(csrfToken);
  }, []);

  return token;
}

/**
 * Helper function to add CSRF token to fetch headers
 * 
 * Usage:
 * const response = await fetch('/api/...', withCSRFToken({
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * }));
 */
export function withCSRFToken(options: RequestInit = {}): RequestInit {
  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  };

  const csrfToken = getCookie('csrf-token');
  
  return {
    ...options,
    headers: {
      ...options.headers,
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
    }
  };
}