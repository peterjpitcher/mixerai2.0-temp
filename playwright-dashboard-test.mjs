#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting MixerAI Dashboard Test\n');

const password = process.argv[2];
const manualLogin = process.argv[2] === '--manual';
const saveAuth = process.argv.includes('--save-auth');
const useAuth = process.argv.includes('--use-auth');

if (!password && !manualLogin && !useAuth) {
  console.log('❌ Password required!');
  console.log('Usage: ');
  console.log('  node playwright-dashboard-test.mjs <password>');
  console.log('  node playwright-dashboard-test.mjs --manual [--save-auth]');
  console.log('  node playwright-dashboard-test.mjs --use-auth');
  console.log('\nOptions:');
  console.log('  --manual     : Log in manually in the browser');
  console.log('  --save-auth  : Save authentication state after login');
  console.log('  --use-auth   : Use saved authentication state');
  console.log('\nFor debugging mode:');
  console.log('  PWDEBUG=1 node playwright-dashboard-test.mjs <password>');
  process.exit(1);
}

// Check if running in debug mode
if (process.env.PWDEBUG) {
  console.log('🐛 Running in Playwright Inspector debug mode...\n');
}

if (manualLogin) {
  console.log('🔑 Manual login mode - you will log in manually\n');
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Dashboard pages to test
const dashboardPages = [
  // Main Dashboard & Core Pages
  { url: 'http://localhost:3000/dashboard', name: 'Dashboard Home' },
  { url: 'http://localhost:3000/dashboard/my-tasks', name: 'My Tasks' },
  { url: 'http://localhost:3000/dashboard/account', name: 'Account Settings' },
  { url: 'http://localhost:3000/dashboard/help', name: 'Help' },
  { url: 'http://localhost:3000/dashboard/release-notes', name: 'Release Notes' },
  
  // Content Management
  { url: 'http://localhost:3000/dashboard/content', name: 'Content List' },
  { url: 'http://localhost:3000/dashboard/content/new', name: 'Create Content' },
  
  // Brands
  { url: 'http://localhost:3000/dashboard/brands', name: 'Brands List' },
  { url: 'http://localhost:3000/dashboard/brands/new', name: 'New Brand' },
  
  // Templates
  { url: 'http://localhost:3000/dashboard/templates', name: 'Templates List' },
  { url: 'http://localhost:3000/dashboard/templates/new', name: 'New Template' },
  
  // Workflows
  { url: 'http://localhost:3000/dashboard/workflows', name: 'Workflows List' },
  { url: 'http://localhost:3000/dashboard/workflows/new', name: 'New Workflow' },
  
  // Product Claims System - Main
  { url: 'http://localhost:3000/dashboard/claims', name: 'Claims List' },
  { url: 'http://localhost:3000/dashboard/claims/new', name: 'New Claim' },
  { url: 'http://localhost:3000/dashboard/claims/pending-approval', name: 'Claims Pending Approval' },
  { url: 'http://localhost:3000/dashboard/claims/preview', name: 'Claims Preview' },
  { url: 'http://localhost:3000/dashboard/claims/definitions', name: 'Claim Definitions' },
  { url: 'http://localhost:3000/dashboard/claims/overrides', name: 'Claim Overrides' },
  { url: 'http://localhost:3000/dashboard/claims/brand-review', name: 'Brand Review' },
  
  // Product Claims System - Workflows
  { url: 'http://localhost:3000/dashboard/claims/workflows', name: 'Claims Workflows List' },
  { url: 'http://localhost:3000/dashboard/claims/workflows/new', name: 'New Claims Workflow' },
  
  // Product Claims System - Products
  { url: 'http://localhost:3000/dashboard/claims/products', name: 'Claims Products List' },
  { url: 'http://localhost:3000/dashboard/claims/products/new', name: 'New Claims Product' },
  
  // Product Claims System - Ingredients
  { url: 'http://localhost:3000/dashboard/claims/ingredients', name: 'Claims Ingredients List' },
  { url: 'http://localhost:3000/dashboard/claims/ingredients/new', name: 'New Claims Ingredient' },
  
  // Product Claims System - Brands
  { url: 'http://localhost:3000/dashboard/claims/brands', name: 'Claims Brands List' },
  { url: 'http://localhost:3000/dashboard/claims/brands/new', name: 'New Claims Brand' },
  
  // Tools
  { url: 'http://localhost:3000/dashboard/tools/metadata-generator', name: 'Metadata Generator' },
  { url: 'http://localhost:3000/dashboard/tools/alt-text-generator', name: 'Alt Text Generator' },
  { url: 'http://localhost:3000/dashboard/tools/content-transcreator', name: 'Content Transcreator' },
  
  // User Management
  { url: 'http://localhost:3000/dashboard/users', name: 'Users List' },
  { url: 'http://localhost:3000/dashboard/users/invite', name: 'Invite User' },
  
  // Admin-Only
  { url: 'http://localhost:3000/dashboard/issues', name: 'Issues (Admin Only)' }
];

async function runTest() {
  const results = {
    timestamp: new Date().toISOString(),
    authStatus: 'not_attempted',
    totalErrors: 0,
    totalWarnings: 0,
    totalPages: 0,
    pages: []
  };

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,  // Increased slowMo to make actions more visible
    devtools: true  // Opens DevTools automatically
  });

  try {
    console.log('✅ Browser launched\n');
    
    // Create context with saved auth if available
    const contextOptions = {
      viewport: { width: 1920, height: 1080 }
    };
    
    if (useAuth) {
      // Check if auth state file exists
      try {
        await fs.access('auth-state.json');
        contextOptions.storageState = 'auth-state.json';
        console.log('🔐 Using saved authentication state\n');
      } catch (e) {
        console.log('❌ No saved auth state found!');
        console.log('   Please run first with: node playwright-dashboard-test.mjs --manual --save-auth\n');
        await browser.close();
        process.exit(1);
      }
    }
    
    const context = await browser.newContext(contextOptions);
    
    const page = await context.newPage();
    
    // Capture console logs
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('   🔴 Browser console error:', msg.text());
      } else if (msg.type() === 'warning') {
        console.log('   🟡 Browser console warning:', msg.text());
      }
    });
    
    // Capture page errors with full stack trace
    page.on('pageerror', error => {
      console.log('   💥 Page error:', error.message);
      if (error.stack) {
        console.log('   📍 Stack trace:', error.stack);
      }
    });
    
    // Capture failed requests
    page.on('requestfailed', request => {
      console.log('   ❌ Request failed:', request.url(), '-', request.failure().errorText);
    });
    
    // Add delay between requests to avoid rate limiting
    const REQUEST_DELAY = 2000; // 2 seconds between page loads
    
    // Handle different authentication modes
    if (useAuth) {
      // Skip login entirely and go straight to dashboard
      console.log('🔐 Using saved authentication\n');
      console.log('   📍 Navigating to dashboard...');
      await page.goto('http://localhost:3000/dashboard', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      const currentUrl = page.url();
      if (currentUrl.includes('/auth/login')) {
        console.log('   ❌ Redirected to login - saved auth may have expired');
        console.log('   💡 Please run with --manual --save-auth to refresh\n');
        results.authStatus = 'expired';
      } else {
        console.log(`   ✅ Authentication valid! Now on: ${currentUrl}\n`);
        results.authStatus = 'success';
        
        // Run dashboard tests
        console.log(`📊 Testing ${dashboardPages.length} dashboard pages...\n`);
        
        try {
          for (let i = 0; i < dashboardPages.length; i++) {
            console.log(`⏳ Waiting ${REQUEST_DELAY}ms before page ${i + 1}/${dashboardPages.length}...\n`);
            await delay(REQUEST_DELAY);
            await testPage(page, dashboardPages[i], results);
          }
        } catch (testError) {
          console.error('🔴 Error during dashboard testing:', testError.message);
        }
      }
      
    } else if (manualLogin) {
      console.log('🔐 Manual Login Mode\n');
      console.log('   📍 Navigating to login page...');
      await page.goto('http://localhost:3000/auth/login', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      console.log('   ⏸️  PAUSING FOR MANUAL LOGIN');
      console.log('   👉 Please log in manually in the browser window');
      console.log('   👉 Once you see the dashboard, close the Inspector or press Resume\n');
      
      // Pause for manual login
      await page.pause();
      
      console.log('   ✅ Manual login completed, continuing with tests...\n');
      
      // Check where we are now
      const currentUrl = page.url();
      if (currentUrl.includes('/auth/login')) {
        console.log('   ❌ Still on login page after manual attempt');
        results.authStatus = 'failed';
      } else {
        console.log(`   ✅ Logged in! Now on: ${currentUrl}\n`);
        results.authStatus = 'success';
        
        // Save auth state if requested
        if (saveAuth) {
          await context.storageState({ path: 'auth-state.json' });
          console.log('   💾 Saved authentication state to auth-state.json\n');
        }
        
        // Run dashboard tests after manual login
        console.log(`📊 Testing ${dashboardPages.length} dashboard pages...\n`);
        
        try {
          for (let i = 0; i < dashboardPages.length; i++) {
            console.log(`⏳ Waiting ${REQUEST_DELAY}ms before page ${i + 1}/${dashboardPages.length}...\n`);
            await delay(REQUEST_DELAY);
            await testPage(page, dashboardPages[i], results);
          }
        } catch (testError) {
          console.error('🔴 Error during dashboard testing:', testError.message);
        }
      }
      
    } else {
      // Automatic login
      console.log('🔐 Logging in to MixerAI...\n');
      
      try {
        console.log('   📍 Navigating to login page...');
        const loginResponse = await page.goto('http://localhost:3000/auth/login', {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        console.log(`   📍 Login page status: ${loginResponse.status()}`);

        // Wait a bit for page to be ready
        console.log('   ⏳ Waiting for page to be fully loaded...');
        await delay(2000);
      
      // Despite the JS error, let's try to proceed with login
      console.log('   ⚠️  Note: There\'s a JavaScript error on the page, but attempting to continue...\n');
      
      // Fill login form using Playwright's fill method
      console.log('   📝 Filling login form...');
      console.log('   📧 Email: peter.pitcher@outlook.com');
      
      try {
        await page.fill('input[type="email"]', 'peter.pitcher@outlook.com');
        console.log('   ✅ Email field filled');
      } catch (e) {
        console.log('   ❌ Failed to fill email:', e.message);
        // Take screenshot to see what's on the page
        await page.screenshot({ 
          path: 'login-page-debug.png',
          fullPage: true 
        });
        throw e;
      }
      
      try {
        await page.fill('input[type="password"]', password);
        console.log('   ✅ Password field filled');
      } catch (e) {
        console.log('   ❌ Failed to fill password:', e.message);
        throw e;
      }
      
      // Take screenshot before clicking submit
      console.log('   📸 Taking screenshot of filled form...');
      await page.screenshot({ 
        path: 'login-form-filled.png',
        fullPage: true 
      });
      
      console.log('   🖱️  Clicking submit button and waiting for response...');
      
      // Try to click submit and wait for either navigation or API response
      try {
        await Promise.all([
          page.click('button[type="submit"]'),
          Promise.race([
            // Wait for navigation
            page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }),
            // OR wait for API response
            page.waitForResponse(response => 
              response.url().includes('/api/auth/') && 
              (response.status() === 200 || response.status() === 201),
              { timeout: 20000 }
            ),
            // OR wait for a dashboard element
            page.waitForSelector('[data-testid="dashboard"], nav:has(a[href="/dashboard"]), button:has-text("Logout")', 
              { timeout: 20000 }
            ).catch(() => null)
          ])
        ]);
        console.log('   ✅ Submit action completed');
      } catch (e) {
        console.log('   ⚠️  Submit action timeout/error:', e.message);
        // Continue anyway to see where we are
      }
      
      console.log('   ⏳ Login response received...');
      
      // Add a delay to see what happens
      await delay(2000);
      
      try {
        
        // Log where we landed
        const afterLoginUrl = page.url();
        console.log(`   ➡️  Landed on: ${afterLoginUrl}`);
        
        // Take screenshot of where we are
        await page.screenshot({ 
          path: 'after-login.png',
          fullPage: true 
        });
        
        // Check if we're still on login page (indicating failure)
        if (afterLoginUrl.includes('/auth/login')) {
          console.log('   ❌ Still on login page, checking for errors...');
          
          // Try to find any error message
          try {
            const errorText = await page.textContent('.text-destructive, .text-red-500, .text-red-600, .error-message, [role="alert"]');
            if (errorText) {
              console.log(`   ❌ Error message: ${errorText}`);
            }
          } catch {
            // No error element found
          }
          
          // Take screenshot of login page with potential error
          await page.screenshot({ 
            path: 'login-error.png',
            fullPage: true 
          });
          
          results.authStatus = 'failed';
        } else {
          // We've successfully navigated away from login
          console.log(`   ✅ Login successful! Now on: ${afterLoginUrl}\n`);
          results.authStatus = 'success';
          
          // Test ALL dashboard pages

          console.log(`📊 Testing ${dashboardPages.length} dashboard pages...\n`);
          
          try {
            for (let i = 0; i < dashboardPages.length; i++) {
              console.log(`⏳ Waiting ${REQUEST_DELAY}ms before page ${i + 1}/${dashboardPages.length}...\n`);
              await delay(REQUEST_DELAY);
              await testPage(page, dashboardPages[i], results);
            }
          } catch (testError) {
            console.error('🔴 Error during dashboard testing:', testError.message);
          }
        }
        
      } catch (navError) {
        console.log('   ❌ Navigation error:', navError.message);
        results.authStatus = 'error';
      }

    } catch (loginError) {
      console.log('   ❌ Login error:', loginError.message, '\n');
      results.authStatus = 'error';
    }
    } // End of else block for automatic login

    // Save results
    await saveResults(results);
    
    console.log('\n⏰ Keeping browser open for 30 seconds for inspection...');
    await delay(30000);

  } catch (error) {
    console.error('💥 Fatal error:', error);
  } finally {
    await browser.close();
  }
}

async function testPage(page, pageInfo, results) {
  console.log(`📄 Testing: ${pageInfo.name}`);
  console.log(`   URL: ${pageInfo.url}`);
  
  results.totalPages++;
  
  const pageResult = {
    name: pageInfo.name,
    url: pageInfo.url,
    status: null,
    errors: [],
    warnings: [],
    networkErrors: []
  };

  // Set up console capture
  const consoleHandler = msg => {
    const entry = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    };
    
    if (msg.type() === 'error') {
      pageResult.errors.push(entry);
      results.totalErrors++;
      console.log(`   ❌ ERROR: ${msg.text()}`);
    } else if (msg.type() === 'warning' || msg.type() === 'warn') {
      pageResult.warnings.push(entry);
      results.totalWarnings++;
      console.log(`   ⚠️  WARNING: ${msg.text()}`);
    }
  };

  // Set up network error capture
  const requestFailedHandler = request => {
    const url = request.url();
    if (!url.includes('chrome-extension://')) {
      const failure = request.failure();
      pageResult.networkErrors.push({
        url: url,
        error: failure?.errorText || 'Unknown error'
      });
      console.log(`   🔗 Network error: ${failure?.errorText} - ${url}`);
    }
  };

  page.on('console', consoleHandler);
  page.on('requestfailed', requestFailedHandler);

  try {
    const response = await page.goto(pageInfo.url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    pageResult.status = response.status();
    console.log(`   ✅ Status: ${response.status()}`);
    
    // Wait for any delayed console messages
    await delay(2000);
    
    // Take screenshot
    const screenshotsDir = path.join(__dirname, 'screenshots');
    await fs.mkdir(screenshotsDir, { recursive: true });
    const screenshotName = pageInfo.name.toLowerCase().replace(/[^\w-]+/g, '-');
    await page.screenshot({
      path: path.join(screenshotsDir, `${screenshotName}.png`),
      fullPage: true
    });
    
    console.log(`   📊 Errors: ${pageResult.errors.length}, Warnings: ${pageResult.warnings.length}`);
    console.log(`   📸 Screenshot saved\n`);
    
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}\n`);
    pageResult.status = 'failed';
    pageResult.errors.push({
      type: 'navigation',
      text: error.message
    });
  }

  page.off('console', consoleHandler);
  page.off('requestfailed', requestFailedHandler);
  results.pages.push(pageResult);
}

async function saveResults(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(__dirname, `dashboard-test-results-${timestamp}.json`);
  const reportPath = path.join(__dirname, `dashboard-test-report-${timestamp}.txt`);
  
  // Save JSON results
  await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));
  
  // Generate detailed text report
  let report = `MixerAI Dashboard Test Report
Generated: ${results.timestamp}
================================================================================

EXECUTIVE SUMMARY
-----------------
Total Pages Tested: ${results.totalPages}
Authentication Status: ${results.authStatus}
Total Errors Found: ${results.totalErrors}
Total Warnings Found: ${results.totalWarnings}

CRITICAL ISSUES
---------------
`;

  // Find pages with errors
  const pages404 = results.pages.filter(p => p.status === 404);
  const pages500 = results.pages.filter(p => p.status === 500);
  const jsErrors = results.pages.filter(p => p.errors.some(e => e.text?.includes('TypeError') || e.text?.includes('ReferenceError')));

  if (pages404.length > 0) {
    report += `\n❌ Pages returning 404 (Not Found):\n`;
    pages404.forEach(p => {
      report += `   - ${p.name} (${p.url})\n`;
    });
  }

  if (pages500.length > 0) {
    report += `\n❌ Pages returning 500 (Server Error):\n`;
    pages500.forEach(p => {
      report += `   - ${p.name} (${p.url})\n`;
    });
  }

  if (jsErrors.length > 0) {
    report += `\n❌ Pages with JavaScript errors:\n`;
    jsErrors.forEach(p => {
      const errorText = p.errors.find(e => e.text?.includes('Error'))?.text || 'Unknown error';
      report += `   - ${p.name}: ${errorText}\n`;
    });
  }

  const totalCriticalIssues = pages404.length + pages500.length + jsErrors.length;
  if (totalCriticalIssues === 0) {
    report += `No critical issues found! ✅\n`;
  }

  // Pages with any errors
  const pagesWithAnyError = results.pages.filter(p => p.errors.length > 0);
  if (pagesWithAnyError.length > 0) {
    report += `\n\nPAGES WITH ERRORS (${pagesWithAnyError.length})
------------------\n`;
    pagesWithAnyError.forEach(page => {
      report += `\n${page.name}\n`;
      report += `URL: ${page.url}\n`;
      report += `Status: ${page.status}\n`;
      page.errors.forEach((e, i) => {
        report += `  Error ${i + 1}: ${e.text}\n`;
      });
    });
  }

  // Detailed results by section
  report += `\n\nDETAILED RESULTS BY SECTION
===========================\n`;

  const sections = {
    'Main Dashboard': results.pages.filter(p => 
      p.url.includes('/dashboard') && 
      !p.url.includes('/claims/') && 
      !p.url.includes('/tools/') && 
      !p.url.includes('/content/') &&
      !p.url.includes('/brands/') &&
      !p.url.includes('/users/') &&
      !p.url.includes('/workflows/') &&
      !p.url.includes('/templates/')
    ),
    'Content Management': results.pages.filter(p => p.url.includes('/content')),
    'Claims System': results.pages.filter(p => p.url.includes('/claims')),
    'Brand Management': results.pages.filter(p => p.url.includes('/brands')),
    'User Management': results.pages.filter(p => p.url.includes('/users')),
    'Workflows': results.pages.filter(p => p.url.includes('/workflows')),
    'Templates': results.pages.filter(p => p.url.includes('/templates')),
    'Tools': results.pages.filter(p => p.url.includes('/tools'))
  };

  Object.entries(sections).forEach(([sectionName, pages]) => {
    if (pages.length > 0) {
      report += `\n${sectionName} (${pages.length} pages)\n${'-'.repeat(sectionName.length + 10)}\n`;
      
      const sectionErrors = pages.reduce((sum, p) => sum + p.errors.length, 0);
      const sectionWarnings = pages.reduce((sum, p) => sum + p.warnings.length, 0);
      
      report += `Total Errors: ${sectionErrors}, Total Warnings: ${sectionWarnings}\n`;
      
      pages.forEach(page => {
        const status = page.errors.length > 0 ? '❌' : '✅';
        report += `${status} ${page.name} - ${page.errors.length} errors, ${page.warnings.length} warnings\n`;
      });
    }
  });

  // Write report
  await fs.writeFile(reportPath, report);
  
  console.log(`\n📊 TEST COMPLETE!`);
  console.log(`   Total Pages: ${results.totalPages}`);
  console.log(`   Total Errors: ${results.totalErrors}`);
  console.log(`   Total Warnings: ${results.totalWarnings}`);
  console.log(`\n📁 Results saved:`);
  console.log(`   JSON: ${jsonPath}`);
  console.log(`   Report: ${reportPath}`);
  console.log(`   Screenshots: ${path.join(__dirname, 'screenshots')}/`);
}

// Run the test
runTest().catch(console.error);