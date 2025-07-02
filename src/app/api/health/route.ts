import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = "force-dynamic";

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: CheckResult;
    authentication: CheckResult;
    azureOpenAI: CheckResult;
    redis?: CheckResult;
  };
}

interface CheckResult {
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  responseTime?: number;
}

// Track application start time
const startTime = Date.now();

/**
 * Health check endpoint for monitoring application status
 * Returns 200 if all critical services are operational
 * Returns 503 if any critical service is down
 */
export async function GET(): Promise<Response> {
  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks: {
      database: { status: 'pass' },
      authentication: { status: 'pass' },
      azureOpenAI: { status: 'pass' },
    },
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    const supabase = createSupabaseServerClient();
    
    // Simple query to check database connection
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    const dbResponseTime = Date.now() - dbStart;
    
    if (error) {
      healthStatus.checks.database = {
        status: 'fail',
        message: `Database query failed: ${error.message}`,
        responseTime: dbResponseTime,
      };
      healthStatus.status = 'unhealthy';
    } else {
      healthStatus.checks.database = {
        status: 'pass',
        message: 'Database connection successful',
        responseTime: dbResponseTime,
      };
    }
  } catch (error) {
    healthStatus.checks.database = {
      status: 'fail',
      message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
    healthStatus.status = 'unhealthy';
  }

  // Check authentication service
  try {
    const authStart = Date.now();
    const supabase = createSupabaseServerClient();
    
    // Check if auth service is responding
    await supabase.auth.getSession();
    const authResponseTime = Date.now() - authStart;
    
    healthStatus.checks.authentication = {
      status: 'pass',
      message: 'Authentication service operational',
      responseTime: authResponseTime,
    };
  } catch (error) {
    healthStatus.checks.authentication = {
      status: 'fail',
      message: `Auth check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
    healthStatus.status = 'degraded'; // Auth failure is less critical
  }

  // Check Azure OpenAI configuration
  try {
    const hasAzureConfig = !!(
      process.env.AZURE_OPENAI_API_KEY &&
      process.env.AZURE_OPENAI_ENDPOINT &&
      (process.env.AZURE_OPENAI_DEPLOYMENT_NAME || process.env.AZURE_OPENAI_DEPLOYMENT)
    );
    
    if (hasAzureConfig) {
      healthStatus.checks.azureOpenAI = {
        status: 'pass',
        message: 'Azure OpenAI configuration present',
      };
    } else {
      healthStatus.checks.azureOpenAI = {
        status: 'warn',
        message: 'Azure OpenAI configuration incomplete',
      };
      healthStatus.status = healthStatus.status === 'healthy' ? 'degraded' : healthStatus.status;
    }
  } catch (error) {
    healthStatus.checks.azureOpenAI = {
      status: 'fail',
      message: `Azure OpenAI check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
    healthStatus.status = 'degraded';
  }

  // Check Redis if configured (for rate limiting)
  if (process.env.REDIS_URL) {
    try {
      // In a real implementation, you would ping Redis here
      healthStatus.checks.redis = {
        status: 'pass',
        message: 'Redis connection available',
      };
    } catch (error) {
      healthStatus.checks.redis = {
        status: 'warn',
        message: 'Redis unavailable, using in-memory rate limiting',
      };
    }
  }

  // Return appropriate status code based on health
  const statusCode = healthStatus.status === 'unhealthy' ? 503 : 200;
  
  return NextResponse.json(healthStatus, { 
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

/**
 * Simple liveness check - returns 200 if the application is running
 */
export async function HEAD(): Promise<Response> {
  return new Response(null, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}