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
export const isDatabaseConnectionError = (error: any): boolean => {
  if (!error) return false;
  
  // Check for common database connection error codes
  if (
    error.code === 'ECONNREFUSED' ||
    error.code === 'ConnectionError' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'EAI_AGAIN' ||
    error.code === '42P01' // Postgres undefined table error
  ) {
    return true;
  }
  
  // Check for common error message patterns
  if (error.message && typeof error.message === 'string') {
    const errorMessage = error.message.toLowerCase();
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
  error: any, 
  message: string = 'An error occurred', 
  status: number = 500
) => {
  // Enhanced error object for logging
  const errorDetails = {
    message: error?.message || 'Unknown error',
    code: error?.code || 'UNKNOWN',
    hint: error?.hint || '',
    source: error?.source || 'unknown',
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
      details: isProduction() ? 'See server logs for details' : (error?.message || error?.toString()),
      hint: error?.hint || '',
      code: error?.code || ''
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