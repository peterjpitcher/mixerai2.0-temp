'use client';

import { useState, useEffect } from 'react';

interface EnvironmentInfo {
  supabaseUrl: string;
  supabaseAnonKey: string;
  nodeEnv?: string;
  vercelEnv?: string;
  debugMode?: string;
  buildDate: string;
}

interface TestResult {
  status: 'pending' | 'testing' | 'success' | 'error';
  statusCode?: number;
  statusText?: string;
  responseTime?: number;
  message?: string;
  stack?: string;
  data?: unknown;
}

export function DebugPanel() {
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo | null>(null);
  const [apiTest, setApiTest] = useState<TestResult>({ status: 'pending' });
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [connectionTest, setConnectionTest] = useState<TestResult>({ status: 'pending' });

  useEffect(() => {
    // Check if debug panel is enabled
    if (process.env.DEBUG_PANEL_ENABLED !== 'true') {
      return;
    }
    
    // Get environment variables (client-side ones only)
    setEnvInfo({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing',
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
      debugMode: process.env.DEBUG_MODE,
      buildDate: process.env.NEXT_PUBLIC_BUILD_DATE || 'Unknown',
    });

    // Test the API
    async function testApi() {
      setApiTest({ status: 'testing' });
      try {
        const startTime = performance.now();
        const response = await fetch('/api/brands?limit=all');
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        if (!response.ok) {
          setApiTest({
            status: 'error',
            statusCode: response.status,
            statusText: response.statusText,
            responseTime,
            message: `Failed to fetch: ${response.status} ${response.statusText}`
          });
          return;
        }
        
        const data = await response.json();
        setApiTest({
          status: 'success',
          responseTime,
          data: {
            success: data.success,
            brandCount: data.brands?.length || 0,
            isMockData: data.isMockData || false,
            isFallback: data.isFallback || false,
            debug: data.debug
          }
        });
      } catch (error: unknown) {
        setApiTest({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack?.split('\n')[0] : undefined
        });
      }
    }
    
    // Test direct connection to Supabase
    async function testConnection() {
      setConnectionTest({ status: 'testing' });
      try {
        const startTime = performance.now();
        // We use a simple endpoint that tests the Supabase connection
        const response = await fetch('/api/test-connection');
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        if (!response.ok) {
          setConnectionTest({
            status: 'error',
            statusCode: response.status,
            statusText: response.statusText,
            responseTime,
            message: `Failed to connect: ${response.status} ${response.statusText}`
          });
          return;
        }
        
        const data = await response.json();
        setConnectionTest({
          status: 'success',
          responseTime,
          data: data
        });
      } catch (error: unknown) {
        setConnectionTest({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack?.split('\n')[0] : undefined
        });
      }
    }
    
    testApi();
    testConnection();
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section) 
        : [...prev, section]
    );
  };

  // Check if debug panel is enabled via env
  if (!envInfo || process.env.DEBUG_PANEL_ENABLED !== 'true') {
    return null;
  }

  return (
    <div className="bg-black text-white p-4 rounded-md text-xs font-mono mb-6">
      <h2 className="text-lg font-bold mb-3">MixerAI 2.0 Debug Panel</h2>
      
      <div className="mb-3">
        <div 
          className="cursor-pointer font-semibold p-2 bg-gray-900 flex justify-between items-center"
          onClick={() => toggleSection('env')}
        >
          <span>Environment Variables</span>
          <span className={
            !envInfo.supabaseUrl.includes('✓') || !envInfo.supabaseAnonKey.includes('✓')
              ? 'text-red-500'
              : 'text-green-500'
          }>
            {!envInfo.supabaseUrl.includes('✓') || !envInfo.supabaseAnonKey.includes('✓')
              ? '⚠️'
              : '✅'}
            {expandedSections.includes('env') ? '▼' : '▶'}
          </span>
        </div>
        {expandedSections.includes('env') && (
          <div className="p-2 bg-gray-800">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(envInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div className="mb-3">
        <div 
          className="cursor-pointer font-semibold p-2 bg-gray-900 flex justify-between items-center"
          onClick={() => toggleSection('api')}
        >
          <span>API Test (/api/brands)</span>
          <span 
            className={
              apiTest.status === 'error' 
                ? 'text-red-500' 
                : apiTest.status === 'success' 
                  ? 'text-green-500' 
                  : 'text-yellow-500'
            }
          >
            {apiTest.status === 'error' 
              ? '❌' 
              : apiTest.status === 'success' 
                ? '✅' 
                : '⏳'}
            {expandedSections.includes('api') ? '▼' : '▶'}
          </span>
        </div>
        {expandedSections.includes('api') && (
          <div className="p-2 bg-gray-800">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(apiTest, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div className="mb-3">
        <div 
          className="cursor-pointer font-semibold p-2 bg-gray-900 flex justify-between items-center"
          onClick={() => toggleSection('connection')}
        >
          <span>Database Connection Test</span>
          <span 
            className={
              connectionTest.status === 'error' 
                ? 'text-red-500' 
                : connectionTest.status === 'success' 
                  ? 'text-green-500' 
                  : 'text-yellow-500'
            }
          >
            {connectionTest.status === 'error' 
              ? '❌' 
              : connectionTest.status === 'success' 
                ? '✅' 
                : '⏳'}
            {expandedSections.includes('connection') ? '▼' : '▶'}
          </span>
        </div>
        {expandedSections.includes('connection') && (
          <div className="p-2 bg-gray-800">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(connectionTest, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div className="mb-3">
        <div 
          className="cursor-pointer font-semibold p-2 bg-gray-900 flex justify-between items-center"
          onClick={() => toggleSection('help')}
        >
          <span>Troubleshooting Help</span>
          <span>{expandedSections.includes('help') ? '▼' : '▶'}</span>
        </div>
        {expandedSections.includes('help') && (
          <div className="p-2 bg-gray-800">
            <h3 className="font-bold mb-2">Common Issues:</h3>
            <ul className="list-disc list-inside">
              <li className="mb-1">
                <span className="text-red-400">Missing Supabase credentials:</span> Check your .env file
              </li>
              <li className="mb-1">
                <span className="text-red-400">API Error:</span> Check network console and server logs
              </li>
              <li className="mb-1">
                <span className="text-red-400">Database connection issues:</span> Verify Supabase project is active
              </li>
            </ul>
            <h3 className="font-bold mt-3 mb-2">Quick Fixes:</h3>
            <ul className="list-disc list-inside">
              <li className="mb-1">Run <code className="bg-gray-700 px-1">./scripts/setup-env.sh</code> to set up environment</li>
              <li className="mb-1">Run <code className="bg-gray-700 px-1">node scripts/test-db-connection.js</code> for detailed diagnostics</li>
              <li className="mb-1">Check the logs directory for API error logs</li>
            </ul>
          </div>
        )}
      </div>
      
      <div className="flex justify-between mt-4">
        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-700 text-white px-3 py-1 rounded hover:bg-blue-600"
        >
          Refresh Debug Data
        </button>
        <span className="text-gray-400 text-xs">
          {new Date().toISOString()}
        </span>
      </div>
    </div>
  );
} 
