#!/usr/bin/env node

/**
 * Simplified Code Review Script for MixerAI
 * Runs ESLint and TypeScript checks with clear reporting
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Helper functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Report data
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalIssues: 0,
    eslintErrors: 0,
    eslintWarnings: 0,
    typeScriptErrors: 0,
    passed: false,
  },
  checks: [],
};

async function runESLint() {
  logSection('1. Running ESLint');
  
  try {
    const { stdout } = await execAsync('npx next lint', { maxBuffer: 10 * 1024 * 1024 });
    
    // Count warnings from output
    const warningMatches = stdout.match(/Warning:/g) || [];
    const warningCount = warningMatches.length;
    
    report.summary.eslintWarnings = warningCount;
    
    if (warningCount > 0) {
      logWarning(`Found ${warningCount} ESLint warnings`);
      
      // Parse first few warnings for display
      const lines = stdout.split('\n');
      let displayCount = 0;
      
      lines.forEach(line => {
        if (line.includes('Warning:') && displayCount < 5) {
          console.log(`  ${line.trim()}`);
          displayCount++;
        }
      });
      
      if (warningCount > 5) {
        logInfo(`... and ${warningCount - 5} more warnings`);
      }
      
      report.checks.push({
        name: 'ESLint',
        status: 'warning',
        summary: { errors: 0, warnings: warningCount },
      });
    } else {
      logSuccess('No ESLint issues found');
      report.checks.push({
        name: 'ESLint',
        status: 'passed',
        summary: { errors: 0, warnings: 0 },
      });
    }
    
    return true;
  } catch (error) {
    // ESLint failed - likely has errors
    if (error.stdout) {
      const errorMatches = error.stdout.match(/Error:/g) || [];
      const errorCount = errorMatches.length;
      
      report.summary.eslintErrors = errorCount;
      
      logError(`ESLint found ${errorCount} errors`);
      
      report.checks.push({
        name: 'ESLint',
        status: 'error',
        summary: { errors: errorCount, warnings: 0 },
      });
      
      return false;
    } else {
      logError(`ESLint failed: ${error.message}`);
      report.checks.push({
        name: 'ESLint',
        status: 'error',
        error: error.message,
      });
      return false;
    }
  }
}

async function runTypeScript() {
  logSection('2. Running TypeScript Compiler');
  
  try {
    await execAsync('npx tsc --noEmit', { maxBuffer: 10 * 1024 * 1024 });
    
    logSuccess('No TypeScript errors found');
    report.checks.push({
      name: 'TypeScript',
      status: 'passed',
      summary: { errors: 0 },
    });
    return true;
  } catch (error) {
    if (error.stdout || error.stderr) {
      const output = error.stdout || error.stderr;
      const lines = output.split('\n').filter(line => line.trim());
      
      // Count errors
      const errorLines = lines.filter(line => line.includes('error TS'));
      const errorCount = errorLines.length;
      
      report.summary.typeScriptErrors = errorCount;
      
      logError(`Found ${errorCount} TypeScript errors`);
      
      // Show first 10 errors
      console.log('');
      errorLines.slice(0, 10).forEach(line => {
        console.log(`  ${line}`);
      });
      
      if (errorCount > 10) {
        logInfo(`\n... and ${errorCount - 10} more errors`);
      }
      
      report.checks.push({
        name: 'TypeScript',
        status: 'error',
        summary: { errors: errorCount },
      });
      
      return false;
    } else {
      logError(`TypeScript check failed: ${error.message}`);
      report.checks.push({
        name: 'TypeScript',
        status: 'error',
        error: error.message,
      });
      return false;
    }
  }
}

async function generateReport() {
  logSection('Summary');
  
  // Calculate total issues
  report.summary.totalIssues = 
    report.summary.eslintErrors + 
    report.summary.eslintWarnings + 
    report.summary.typeScriptErrors;
  
  // Determine if all checks passed
  report.summary.passed = report.checks.every(check => 
    check.status === 'passed' || check.status === 'warning'
  );
  
  // Write JSON report
  const reportPath = path.join(process.cwd(), 'code-review-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\nTotal Issues: ${report.summary.totalIssues}`);
  console.log(`  ESLint Errors: ${report.summary.eslintErrors}`);
  console.log(`  ESLint Warnings: ${report.summary.eslintWarnings}`);
  console.log(`  TypeScript Errors: ${report.summary.typeScriptErrors}`);
  
  console.log(`\n📄 Report saved to: ${reportPath}`);
  
  if (report.summary.passed) {
    console.log('');
    logSuccess('All critical checks passed! Ready for build.');
    console.log('');
  } else {
    console.log('');
    logError('Critical issues found. Please fix before building.');
    console.log('');
    
    // Provide fix commands
    if (report.summary.eslintErrors > 0 || report.summary.eslintWarnings > 0) {
      logInfo('To auto-fix ESLint issues, run: npm run lint -- --fix');
    }
    if (report.summary.typeScriptErrors > 0) {
      logInfo('To see all TypeScript errors, run: npx tsc --noEmit');
    }
    
    process.exit(1);
  }
}

// Main execution
async function main() {
  console.clear();
  log('🔍 MixerAI Code Review Tool', colors.bright + colors.magenta);
  log('Running code quality checks...\n', colors.cyan);
  
  try {
    await runESLint();
    await runTypeScript();
    await generateReport();
  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main();