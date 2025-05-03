import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { isDatabaseConnectionError } from '@/lib/api-utils';

/**
 * API route to test database connectivity
 * This is helpful for diagnosing connection issues in production
 */
export async function GET() {
  const startTime = Date.now();
  
  try {
    console.log('Database connection test initiated');
    const supabase = createSupabaseAdminClient();
    
    // First test: Simple database query
    console.log('Running simple database test query');
    const { data: testData, error: testError } = await supabase
      .from('brands')
      .select('id, name')
      .limit(1);
      
    if (testError) throw testError;
    
    const queryTime = Date.now() - startTime;
    
    // If we reached here, the query succeeded
    console.log(`Database connection test successful (${queryTime}ms)`);
    
    return NextResponse.json({
      success: true,
      message: 'Database connection is working properly',
      diagnostics: {
        dataRetrieved: testData ? true : false,
        recordCount: testData?.length || 0,
        queryTimeMs: queryTime,
        dbUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configured' : 'Missing',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error('Database connection test failed after', elapsed, 'ms:', error);
    
    // Create diagnostic info
    const diagnostics = {
      errorCode: error.code,
      errorMessage: error.message,
      timeMs: elapsed,
      isDatabaseConnectionError: isDatabaseConnectionError(error),
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL 
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 10)}...` 
        : 'Missing',
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json({
      success: false,
      message: 'Database connection test failed',
      error: error.message || 'Unknown error',
      diagnostics
    }, { status: 500 });
  }
} 