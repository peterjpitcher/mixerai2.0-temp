import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import os from 'os';

interface ConnectionResult {
  status: string;
  supbaseConnected: boolean;
  queryResult?: any;
  error?: string;
  errorDetails?: any;
  environment: string;
  debug: {
    timestamp: string;
    systemInfo: {
      nodeVersion: string;
      platform: string;
      hostname: string;
      freeMemory: string;
      uptime: string;
    };
    env: {
      supabaseUrl: string;
      supabaseServiceRole: string;
      nodeEnv: string;
    };
  };
}

export async function GET() {
  console.log('🔍 API: /api/test-connection GET request received');
  
  const result: ConnectionResult = {
    status: 'pending',
    supbaseConnected: false,
    environment: process.env.NODE_ENV || 'unknown',
    debug: {
      timestamp: new Date().toISOString(),
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        hostname: os.hostname(),
        freeMemory: Math.round(os.freemem() / 1024 / 1024) + 'MB',
        uptime: Math.round(os.uptime() / 60) + ' minutes'
      },
      env: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing',
        supabaseServiceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing',
        nodeEnv: process.env.NODE_ENV || 'unknown'
      }
    }
  };
  
  try {
    // Attempt to create Supabase client
    console.log('🔌 Creating Supabase admin client...');
    const supabase = createSupabaseAdminClient();
    
    // Test connection with a simple query
    console.log('📊 Testing connection with a simple query...');
    const startTime = Date.now();
    
    // Use a simple query to test connection instead of RPC
    const { data, error, status } = await supabase
      .from('brands')
      .select('count')
      .limit(1);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }
    
    // Query succeeded
    result.status = 'success';
    result.supbaseConnected = true;
    result.queryResult = {
      responseTime: responseTime,
      data: data,
      httpStatus: status
    };
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Connection test failed:', error);
    
    result.status = 'error';
    result.supbaseConnected = false;
    result.error = error.message;
    
    // Provide diagnostic information
    if (error.message.includes('fetch')) {
      result.error = 'Network error - Cannot reach Supabase server';
    } else if (error.message.includes('auth') || error.message.includes('key')) {
      result.error = 'Authentication error - Invalid Supabase credentials';
    } else if (error.message.includes('relation') || error.message.includes('table')) {
      result.error = 'Schema error - Database tables may not be set up correctly';
    }
    
    result.errorDetails = {
      code: error.code,
      message: error.message,
      stack: error.stack?.split('\n')[0]
    };
    
    return NextResponse.json(result, { status: 500 });
  }
} 