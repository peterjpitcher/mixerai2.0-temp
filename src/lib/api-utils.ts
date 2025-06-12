/**
 * Utility functions for API routes
 */

import { NextResponse } from 'next/server';
import axios from 'axios';

/**
 * Get environment mode (development, production, test)
 */
export const isProduction = () => {
  return process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';
};

/**
 * Check if running during build phase (for static site generation)
 */
export const isBuildPhase = () => {
  return process.env.NEXT_PHASE === 'phase-production-build';
};

/**
 * Check if an error is related to database connection
 * This is used to determine when we should fall back to mock data
 */
export const isDatabaseConnectionError = (error: unknown): boolean => {
  if (!error) return false;
  
  // Check for common database connection error codes
  if (error && typeof error === 'object' && 'code' in error) {
    const code = error.code;
    if (
      code === 'ECONNREFUSED' ||
      code === 'ConnectionError' ||
      code === 'ETIMEDOUT' ||
      code === 'EAI_AGAIN' ||
      code === '42P01' // Postgres undefined table error
    ) {
      return true;
    }
  }
  
  // Check for common error message patterns
  const message = error instanceof Error ? error.message : 
    (error && typeof error === 'object' && 'message' in error ? String(error.message) : '');
    
  if (message && typeof message === 'string') {
    const errorMessage = message.toLowerCase();
    return (
      errorMessage.includes('connection') ||
      errorMessage.includes('connect to database') ||
      errorMessage.includes('connect to server') ||
      errorMessage.includes('auth') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('resolve host')
    );
  }
  
  return false;
};

/**
 * Safely handle database errors, with special handling for build/SSG
 */
export const handleApiError = (
  error: unknown, 
  message: string = 'An error occurred', 
  status: number = 500
) => {
  // Enhanced error object for logging
  const errorDetails = {
    message: (error instanceof Error ? error.message : 
              (error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unknown error')),
    code: (error && typeof error === 'object' && 'code' in error ? String(error.code) : 'UNKNOWN'),
    hint: (error && typeof error === 'object' && 'hint' in error ? String(error.hint) : ''),
    source: (error && typeof error === 'object' && 'source' in error ? String(error.source) : 'unknown'),
    isDatabaseError: isDatabaseConnectionError(error)
  };
  
  // Log the full error in development, but a sanitized version in production
  if (isProduction()) {
    console.error(`API Error [${message}]:`, errorDetails);
  } else {
    console.error(`${message}:`, error);
  }
  
  // During static site generation, we return an empty success
  // to prevent build errors with database connections
  if (isBuildPhase()) {
    console.log('Returning mock data during build phase');
    return NextResponse.json({ 
      success: true, 
      isMockData: true,
      data: []
    });
  }
  
  // If this is a database connection error, provide a more helpful response
  if (isDatabaseConnectionError(error)) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Database connection error. Please try again later.',
        isFallback: true,
      },
      { status: 503 } // Service Unavailable
    );
  }
  
  // Otherwise return the actual error
  return NextResponse.json(
    { 
      success: false, 
      error: message,
      details: isProduction() ? 'See server logs for details' : 
        (error instanceof Error ? error.message : 
         (error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error))),
      hint: (error && typeof error === 'object' && 'hint' in error ? String(error.hint) : ''),
      code: (error && typeof error === 'object' && 'code' in error ? String(error.code) : '')
    },
    { status }
  );
};

export const fetchCountries = async () => {
  try {
    const response = await axios.get('/api/countries');
    return response.data;
  } catch (error) {
    console.error('Error fetching countries:', error);
    return [];
  }
};

export const fetchProducts = async () => {
  try {
    const response = await axios.get('/api/products');
    return response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

export const fetchClaims = async (productId: string, countryCodeValue: string) => {
  try {
    const response = await axios.get(`/api/products/${productId}/stacked-claims`, {
      params: { countryCode: countryCodeValue },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching claims for product:', productId, 'country:', countryCodeValue, error);
    // Return a more structured error or rethrow, to be handled by the caller
    return { success: false, error: 'Failed to fetch claims.', data: [] };
  }
}; 