/**
 * Utility functions for API routes
 */

import { NextResponse } from 'next/server';

/**
 * Get environment mode (development, production, test)
 */
export const isProduction = () => {
  return process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';
};

/**
 * Safely handle database errors, with special handling for build/SSG
 */
export const handleApiError = (
  error: any, 
  message: string = 'An error occurred', 
  status: number = 500
) => {
  // Log the full error in development, but a sanitized version in production
  if (isProduction()) {
    console.error(`API Error [${message}]:`, {
      message: error.message || 'Unknown error',
      code: error.code || 'UNKNOWN',
      hint: error.hint || '',
    });
  } else {
    console.error(`${message}:`, error);
  }
  
  // During static site generation, we return an empty success
  // to prevent build errors with database connections
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('Returning mock data during build phase');
    return NextResponse.json({ 
      success: true, 
      isMockData: true,
      data: []
    });
  }
  
  // If this is a database connection error in production, provide a more helpful response
  if (isProduction() && 
     (error.code === 'ECONNREFUSED' || 
      error.code === 'ConnectionError' || 
      error.message?.includes('connection') ||
      error.message?.includes('auth'))) {
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
      details: isProduction() ? 'See server logs for details' : (error.message || error.toString()),
      hint: error.hint || '',
      code: error.code || ''
    },
    { status }
  );
}; 