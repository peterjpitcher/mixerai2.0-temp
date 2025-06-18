#!/usr/bin/env node

/**
 * Test User Flows Script
 * Tests various API endpoints and user flows in MixerAI 2.0
 */

const https = require('https');
const http = require('http');

// Configuration
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
const isHttps = APP_URL.startsWith('https');
const httpModule = isHttps ? https : http;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

// Helper function to make HTTP requests
function makeRequest(path, options = {}) {
  const url = new URL(path, APP_URL);
  
  const requestOptions = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  return new Promise((resolve, reject) => {
    const req = httpModule.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test runner
async function runTest(name, testFn) {
  process.stdout.write(`Testing ${name}... `);
  try {
    await testFn();
    console.log(`${colors.green}✓ PASSED${colors.reset}`);
    testResults.passed++;
  } catch (error) {
    console.log(`${colors.red}✗ FAILED${colors.reset}`);
    console.log(`  ${colors.gray}Error: ${error.message}${colors.reset}`);
    testResults.failed++;
    testResults.errors.push({ test: name, error: error.message });
  }
}

// Skip test with reason
function skipTest(name, reason) {
  console.log(`${colors.yellow}⊘ SKIPPED${colors.reset} ${name}`);
  console.log(`  ${colors.gray}Reason: ${reason}${colors.reset}`);
  testResults.skipped++;
}

// Test functions
async function testHealthEndpoint() {
  const response = await makeRequest('/api/health');
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  if (!response.data.status || response.data.status !== 'ok') {
    throw new Error('Health check did not return ok status');
  }
}

async function testEnvCheck() {
  const response = await makeRequest('/api/env-check');
  // This endpoint requires auth, so 401 is expected
  if (response.status !== 401 && response.status !== 200) {
    throw new Error(`Unexpected status ${response.status}`);
  }
}

async function testPublicPages() {
  const publicPaths = ['/', '/auth/signin', '/auth/signup', '/features', '/pricing', '/about'];
  
  for (const path of publicPaths) {
    const response = await makeRequest(path);
    if (response.status !== 200 && response.status !== 404) {
      throw new Error(`Path ${path} returned status ${response.status}`);
    }
  }
}

async function testProtectedRoutes() {
  const protectedPaths = [
    '/api/brands',
    '/api/content',
    '/api/claims',
    '/api/workflows'
  ];
  
  for (const path of protectedPaths) {
    const response = await makeRequest(path);
    // Should return 401 Unauthorized without auth
    if (response.status !== 401 && response.status !== 403) {
      throw new Error(`Protected path ${path} returned status ${response.status} instead of 401/403`);
    }
  }
}

async function testDatabaseConnection() {
  const response = await makeRequest('/api/test-connection');
  if (response.status === 401) {
    // Expected if endpoint requires auth
    return;
  }
  if (response.status !== 200) {
    throw new Error(`Database connection test returned status ${response.status}`);
  }
}

async function testAzureOpenAI() {
  // This would need proper auth and API keys
  skipTest('Azure OpenAI Integration', 'Requires authentication and API keys');
}

async function testRecipeUrlScraping() {
  // This would need auth
  skipTest('Recipe URL Scraping', 'Requires authentication');
}

// Main test runner
async function runAllTests() {
  console.log(`\n${colors.blue}MixerAI 2.0 User Flow Tests${colors.reset}`);
  console.log(`Testing against: ${APP_URL}\n`);

  // Basic connectivity tests
  await runTest('Health Endpoint', testHealthEndpoint);
  await runTest('Environment Check', testEnvCheck);
  await runTest('Public Pages Accessibility', testPublicPages);
  await runTest('Protected Routes Security', testProtectedRoutes);
  await runTest('Database Connection', testDatabaseConnection);
  
  // Feature tests that require auth
  skipTest('Authentication Flow', 'Requires interactive browser testing');
  skipTest('Brand Creation', 'Requires authenticated session');
  skipTest('Content Generation', 'Requires authenticated session');
  skipTest('AI Tools', 'Requires authenticated session and API keys');
  skipTest('Workflow Management', 'Requires authenticated session');
  skipTest('Claims Management', 'Requires authenticated session');

  // Print summary
  console.log(`\n${colors.blue}Test Summary:${colors.reset}`);
  console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  console.log(`${colors.yellow}Skipped: ${testResults.skipped}${colors.reset}`);

  if (testResults.errors.length > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    testResults.errors.forEach(({ test, error }) => {
      console.log(`  - ${test}: ${error}`);
    });
  }

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(`\n${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});

// Run tests
runAllTests();