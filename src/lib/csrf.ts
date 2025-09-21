import { NextRequest } from 'next/server';

/**
 * CSRF Protection for API Routes
 * 
 * This module provides CSRF token generation and validation for protecting
 * state-changing API operations (POST, PUT, DELETE, PATCH).
 * 
 * Note: In production, consider using a more robust solution like next-csrf
 * or storing tokens in encrypted session cookies.
 */

const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'csrf-token';
const TOKEN_LENGTH = 32;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const PUBLIC_API_PATTERNS = [
  /^\/?api\/auth\//,
  /^\/?api\/env-check$/,
  /^\/?api\/test-connection$/,
  /^\/?api\/test-metadata-generator$/,
  /^\/?api\/brands\/identity$/,
  /^\/?api\/webhooks\//,
  /^\/?api\/health$/,
  /^\/?api\/test-/,
];

const STATIC_ASSET_PATTERN = /\.(?:js|css|png|jpg|jpeg|gif|webp|ico|svg|woff2?|ttf|map)$/i;

/**
 * Generates a cryptographically secure CSRF token using Web Crypto API
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(TOKEN_LENGTH);
  if (typeof globalThis.crypto !== 'undefined') {
    crypto.getRandomValues(array);
  } else {
    // Fallback for older environments
    for (let i = 0; i < TOKEN_LENGTH; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validates CSRF token from request headers against cookie
 * 
 * @param request - The Next.js request object
 * @returns true if token is valid, false otherwise
 */
export function validateCSRFToken(request: NextRequest): boolean {
  // Skip CSRF validation for safe methods
  const method = request.method?.toUpperCase?.() ?? 'GET';
  if (SAFE_METHODS.has(method)) {
    return true;
  }

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER)?.trim();
  if (!headerToken) {
    console.warn('CSRF validation failed: No token in header');
    return false;
  }

  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value?.trim();
  if (!cookieToken) {
    console.warn('CSRF validation failed: No token in cookie');
    return false;
  }

  // Compare tokens using constant-time comparison to prevent timing attacks
  const isValid = timingSafeEqual(headerToken, cookieToken);

  if (!isValid) {
    console.warn('CSRF validation failed: Token mismatch');
  }

  return isValid;
}

/**
 * Helper to check if a route should have CSRF protection
 * 
 * @param pathname - The request pathname
 * @returns true if route should be protected
 */
export function shouldProtectRoute(pathname: string): boolean {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;

  if (STATIC_ASSET_PATTERN.test(normalizedPath)) {
    return false;
  }

  if (PUBLIC_API_PATTERNS.some((pattern) => pattern.test(normalizedPath))) {
    return false;
  }

  // Public API routes that don't need CSRF protection
  return normalizedPath.startsWith('/api/');
}

/**
 * Error response for CSRF validation failures
 */
export const CSRF_ERROR_RESPONSE = {
  success: false,
  error: 'CSRF validation failed',
  code: 'CSRF_VALIDATION_FAILED',
  message: 'Request rejected due to invalid or missing CSRF token'
};
