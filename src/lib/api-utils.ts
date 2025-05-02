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
  // During static generation, we want to return a more gentle error
  // This ensures the build can complete even if DB connections fail
  console.error(`${message}:`, error);
  
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
  
  // Otherwise return the actual error
  return NextResponse.json(
    { 
      success: false, 
      error: message,
      details: error.message || error.toString(),
      hint: error.hint || '',
      code: error.code || ''
    },
    { status }
  );
}; 