#!/usr/bin/env node

/**
 * MixerAI 2.0 - Route Redirect Testing Script
 * 
 * This script tests the route redirect implementation by making requests
 * to non-dashboard routes and verifying they redirect properly to dashboard routes.
 * 
 * Usage: node scripts/test-redirects.js [baseUrl]
 * Example: node scripts/test-redirects.js http://localhost:3000
 */

const https = require('https');
const http = require('http');
const url = require('url');
const { execSync } = require('child_process');

// Configure base URL (default to localhost)
const baseUrl = process.argv[2] || 'http://localhost:3000';
const parsedBaseUrl = url.parse(baseUrl);
const httpModule = parsedBaseUrl.protocol === 'https:' ? https : http;

console.log(`\n🧪 MixerAI 2.0 - Route Redirect Testing Tool`);
console.log(`🔍 Testing redirects on: ${baseUrl}\n`);

// Check if app is running
try {
  console.log('Checking if application is running...');
  // Make a simple request to check if the app is up
  const testUrl = `${baseUrl}/api/env-check`;
  const startTime = Date.now();
  const response = execSync(`curl -s -o /dev/null -w "%{http_code}" ${testUrl}`).toString().trim();
  const responseTime = Date.now() - startTime;
  
  if (response === '200') {
    console.log(`✅ Application is running (responded in ${responseTime}ms)\n`);
  } else {
    console.error(`❌ Application returned status ${response} - is it running correctly?`);
    process.exit(1);
  }
} catch (error) {
  console.error(`❌ Failed to connect to ${baseUrl} - is the application running?`);
  console.error(error.message);
  process.exit(1);
}

// Test routes and their expected redirects
const routes = [
  // Basic routes
  { source: '/brands', expected: '/dashboard/brands', description: 'Brands index redirect' },
  { source: '/brands/123', expected: '/dashboard/brands/123', description: 'Brand detail redirect' },
  { source: '/brands/456/edit', expected: '/dashboard/brands/456/edit', description: 'Brand edit redirect' },
  { source: '/brands/new', expected: '/dashboard/brands/new', description: 'New brand redirect' },
  { source: '/workflows', expected: '/dashboard/workflows', description: 'Workflows index redirect' },
  { source: '/workflows/abc', expected: '/dashboard/workflows/abc', description: 'Workflow detail redirect' },
  { source: '/workflows/def/edit', expected: '/dashboard/workflows/def/edit', description: 'Workflow edit redirect' },
  { source: '/workflows/new', expected: '/dashboard/workflows/new', description: 'New workflow redirect' },
  { source: '/content', expected: '/dashboard/content/article', description: 'Content index redirect' },
  { source: '/content/article', expected: '/dashboard/content/article', description: 'Content article redirect' },
  { source: '/content/ownedpdp', expected: '/dashboard/content/ownedpdp', description: 'Content owned PDP redirect' },
  { source: '/content/retailerpdp', expected: '/dashboard/content/retailerpdp', description: 'Content retailer PDP redirect' },
  { source: '/content/new', expected: '/dashboard/content/new', description: 'New content redirect' },
  { source: '/users', expected: '/dashboard/users', description: 'Users index redirect' },
  { source: '/users/invite', expected: '/dashboard/users/invite', description: 'User invite redirect' },
  
  // Query parameter tests
  { source: '/brands?sort=name', expected: '/dashboard/brands?sort=name', description: 'Brands with sort parameter' },
  { source: '/workflows?status=draft&sort=date', expected: '/dashboard/workflows?status=draft&sort=date', description: 'Workflows with multiple parameters' },
  { source: '/content/article?tags[]=food&tags[]=health', expected: '/dashboard/content/article?tags[]=food&tags[]=health', description: 'Content with array parameters' },
  { source: '/users?search=Test+User', expected: '/dashboard/users?search=Test+User', description: 'Users with search parameter' },
  
  // Edge cases
  { source: '/brands/../workflows', expected: '/dashboard/workflows', description: 'Path traversal handling' },
  { source: '/BRANDS', expected: '/dashboard/brands', description: 'Case sensitivity test' },
  { source: '/brands/', expected: '/dashboard/brands', description: 'Trailing slash handling' },
  { source: '/brands?', expected: '/dashboard/brands', description: 'Empty query parameter' },
];

// Track results
let passed = 0;
let failed = 0;
const failures = [];

// Function to test a single route
function testRoute(route) {
  return new Promise((resolve) => {
    const testUrl = `${baseUrl}${route.source}`;
    const options = url.parse(testUrl);
    
    // Set to not follow redirects so we can see where it redirects
    options.method = 'HEAD';
    options.headers = {
      'User-Agent': 'MixerAI-Route-Tester/1.0',
    };
    
    const req = httpModule.request(options, (res) => {
      const statusCode = res.statusCode;
      
      // We expect a redirect status (3xx)
      if (statusCode >= 300 && statusCode < 400) {
        const location = res.headers.location;
        
        // Check if the location header is present
        if (!location) {
          failed++;
          failures.push({
            source: route.source,
            expected: route.expected,
            actual: 'No Location header',
            statusCode,
          });
          console.log(`❌ ${route.description}: ${route.source} → No Location header`);
          resolve();
          return;
        }
        
        // Check if it's a full URL (including domain) or a relative URL
        let redirectPath = location;
        if (location.startsWith('http')) {
          const redirectUrl = url.parse(location);
          redirectPath = redirectUrl.pathname + (redirectUrl.search || '');
        }
        
        // Compare expected and actual redirect paths
        const expectedPath = route.expected;
        const sourcePath = route.source;
        
        if (redirectPath === expectedPath || 
            // Handling for query parameters that might be reordered
            (redirectPath.split('?')[0] === expectedPath.split('?')[0] && 
             redirectPath.includes('?') && expectedPath.includes('?'))) {
          passed++;
          console.log(`✅ ${route.description}: ${sourcePath} → ${redirectPath}`);
        } else {
          failed++;
          failures.push({
            source: sourcePath,
            expected: expectedPath,
            actual: redirectPath,
            statusCode,
          });
          console.log(`❌ ${route.description}: ${sourcePath} → ${redirectPath} (expected ${expectedPath})`);
        }
      } else {
        failed++;
        failures.push({
          source: route.source,
          expected: route.expected,
          actual: `Unexpected status code: ${statusCode}`,
          statusCode,
        });
        console.log(`❌ ${route.description}: ${route.source} → Unexpected status code: ${statusCode}`);
      }
      
      resolve();
    });
    
    req.on('error', (error) => {
      failed++;
      failures.push({
        source: route.source,
        expected: route.expected,
        actual: `Request error: ${error.message}`,
        error: error.message,
      });
      console.log(`❌ ${route.description}: ${route.source} → Request error: ${error.message}`);
      resolve();
    });
    
    req.end();
  });
}

// Process all routes sequentially
async function runTests() {
  console.log(`Testing ${routes.length} routes...\n`);
  
  // Run tests one at a time to avoid overloading
  for (const route of routes) {
    await testRoute(route);
  }
  
  // Display summary
  console.log(`\n📊 Test Summary:`);
  console.log(`✅ Passed: ${passed} routes`);
  console.log(`❌ Failed: ${failed} routes`);
  
  if (failed > 0) {
    console.log(`\n❌ Failed Routes:`);
    failures.forEach((failure, index) => {
      console.log(`   ${index + 1}. ${failure.source} → Got: ${failure.actual}, Expected: ${failure.expected}`);
    });
    console.log(`\n⚠️ Some redirects are not working as expected. Please check the implementation.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All redirects are working as expected!`);
    process.exit(0);
  }
}

// Run the tests
runTests(); 