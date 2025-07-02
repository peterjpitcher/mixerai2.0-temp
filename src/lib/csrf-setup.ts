/**
 * CSRF Token Setup
 * 
 * This module ensures CSRF tokens are properly initialized
 * for the application.
 */

import { generateCSRFToken } from './csrf';

/**
 * Initialize CSRF token in browser
 * This should be called early in the application lifecycle
 */
export function initializeCSRFToken(): void {
  if (typeof window === 'undefined') return;
  
  // Check if CSRF token already exists
  const existingToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf-token='));
    
  if (!existingToken) {
    // Generate and set new CSRF token
    const token = generateCSRFToken();
    const secure = window.location.protocol === 'https:';
    
    // Set cookie with appropriate security settings
    document.cookie = `csrf-token=${token}; path=/; SameSite=Strict${secure ? '; Secure' : ''}`;
    
    console.log('[CSRF] Token initialized');
  }
}

/**
 * Get current CSRF token
 */
export function getCSRFToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf-token='))
    ?.split('=')[1];
    
  return token || null;
}

/**
 * Clear CSRF token (useful for logout)
 */
export function clearCSRFToken(): void {
  if (typeof document === 'undefined') return;
  
  // Clear by setting expiry in the past
  document.cookie = 'csrf-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}