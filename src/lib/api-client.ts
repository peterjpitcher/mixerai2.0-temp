/**
 * API client utility for making authenticated requests
 * This implementation uses Supabase's cookie-based auth instead of localStorage
 */

import { createSupabaseClient } from '@/lib/supabase/client';

interface FetchOptions extends RequestInit {
  retries?: number;
}

/**
 * Fetches data from an API endpoint with authentication
 * Uses Supabase's cookie-based authentication
 */
export async function fetchApi(url: string, options: FetchOptions = {}) {
  const { retries = 1, ...fetchOptions } = options;
  
  // Create default headers and merge with provided ones
  const headers = new Headers(fetchOptions.headers || {});
  if (!headers.has('Content-Type') && !fetchOptions.body) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Create fetch options with merged headers
  const requestOptions: RequestInit = {
    ...fetchOptions,
    headers,
  };
  
  // First attempt
  let response = await fetch(url, requestOptions);
  
  // If response is 401 Unauthorized, try to refresh the session
  if (response.status === 401 && retries > 0) {
    console.log('Auth failed, attempting to refresh session...');
    
    try {
      // Use Supabase to refresh the session
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.refreshSession();
      
      if (!error) {
        console.log('Session refreshed, retrying request...');
        // Retry the request with refreshed credentials
        response = await fetch(url, requestOptions);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  }
  
  return response;
}

/**
 * Fetches and parses JSON data from an API endpoint with authentication
 */
export async function fetchApiJson<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
  const response = await fetchApi(url, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(
      errorData.error || `API error: ${response.status} ${response.statusText}`
    );
    throw Object.assign(error, { status: response.status, data: errorData });
  }
  
  return await response.json();
}

/**
 * Posts data to an API endpoint with authentication
 */
export async function postApiJson<T = any, D = any>(
  url: string,
  data: D,
  options: FetchOptions = {}
): Promise<T> {
  const requestOptions: FetchOptions = {
    method: 'POST',
    body: JSON.stringify(data),
    ...options,
  };
  
  return fetchApiJson<T>(url, requestOptions);
}

/**
 * Puts data to an API endpoint with authentication
 */
export async function putApiJson<T = any, D = any>(
  url: string,
  data: D,
  options: FetchOptions = {}
): Promise<T> {
  const requestOptions: FetchOptions = {
    method: 'PUT',
    body: JSON.stringify(data),
    ...options,
  };
  
  return fetchApiJson<T>(url, requestOptions);
}

/**
 * Deletes a resource at an API endpoint with authentication
 */
export async function deleteApiJson<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const requestOptions: FetchOptions = {
    method: 'DELETE',
    ...options,
  };
  
  return fetchApiJson<T>(url, requestOptions);
} 