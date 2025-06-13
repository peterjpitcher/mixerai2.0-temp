#!/usr/bin/env node

/**
 * Comprehensive Code Review Script for MixerAI
 * Runs all code quality checks and produces a detailed report
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

// Report data
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalIssues: 0,
    eslintErrors: 0,
    eslintWarnings: 0,
    typeScriptErrors: 0,
    buildErrors: 0,
    passed: false,
  },
  checks: [],
  recommendations: [],
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

// Check functions
async function checkDependencies() {
  logSection('1. Checking Dependencies');
  
  try {
    const { stdout } = await execAsync('npm ls --depth=0 --json');
    const deps = JSON.parse(stdout);
    
    if (deps.problems && deps.problems.length > 0) {
      logError('Found dependency issues:');
      deps.problems.forEach(problem => logWarning(`  ${problem}`));
      
      report.checks.push({
        name: 'Dependencies',
        status: 'warning',
        issues: deps.problems,
      });
      
      report.recommendations.push('Run "npm install" to fix dependency issues');
      return false;
    }
    
    logSuccess('All dependencies are properly installed');
    report.checks.push({
      name: 'Dependencies',
      status: 'passed',
      issues: [],
    });
    return true;
  } catch (error) {
    logError('Failed to check dependencies');
    report.checks.push({
      name: 'Dependencies',
      status: 'error',
      issues: [error.message],
    });
    return false;
  }
}

async function runESLint() {
  logSection('2. Running ESLint');
  
  try {
    // First try with JSON format
    let useJson = true;
    let stdout;
    try {
      const result = await execAsync('npx next lint --format json', { maxBuffer: 10 * 1024 * 1024 });
      stdout = result.stdout;
    } catch (jsonError) {
      // If JSON format fails, fall back to regular format
      useJson = false;
      const result = await execAsync('npx next lint', { maxBuffer: 10 * 1024 * 1024 });
      stdout = result.stdout;
    }
    
    if (!useJson) {
      // Parse regular ESLint output
      const lines = stdout.split('\n');
      let warningCount = 0;
      const issues = [];
      
      lines.forEach(line => {
        if (line.includes('Warning:')) {
          warningCount++;
          const match = line.match(/^(.+?)\s+(\d+):(\d+)\s+Warning:\s+(.+?)\s+([\w-]+\/[\w-]+)$/);
          if (match) {
            issues.push({
              file: match[1].replace('./src', '/src'),
              line: parseInt(match[2]),
              column: parseInt(match[3]),
              severity: 'warning',
              message: match[4],
              rule: match[5],
            });
          }
        }
      });
      
      report.summary.eslintWarnings = warningCount;
      
      if (warningCount > 0) {
        logWarning(`Found ${warningCount} ESLint warnings`);
        report.checks.push({
          name: 'ESLint',
          status: 'warning',
          issues: issues,
          summary: { errors: 0, warnings: warningCount },
        });
      } else {
        logSuccess('No ESLint issues found');
        report.checks.push({
          name: 'ESLint',
          status: 'passed',
          issues: [],
          summary: { errors: 0, warnings: 0 },
        });
      }
      return true;
    }
    
    // Original JSON parsing code
    const { stdout: jsonOutput } = await execAsync('npx next lint --format json', { maxBuffer: 10 * 1024 * 1024 });
    const results = JSON.parse(stdout);
    
    let errorCount = 0;
    let warningCount = 0;
    const issues = [];
    
    results.forEach(file => {
      if (file.errorCount > 0 || file.warningCount > 0) {
        errorCount += file.errorCount;
        warningCount += file.warningCount;
        
        file.messages.forEach(message => {
          issues.push({
            file: file.filePath.replace(process.cwd(), ''),
            line: message.line,
            column: message.column,
            severity: message.severity === 2 ? 'error' : 'warning',
            message: message.message,
            rule: message.ruleId,
          });
        });
      }
    });
    
    report.summary.eslintErrors = errorCount;
    report.summary.eslintWarnings = warningCount;
    
    if (errorCount > 0) {
      logError(`Found ${errorCount} ESLint errors and ${warningCount} warnings`);
      report.checks.push({
        name: 'ESLint',
        status: 'error',
        issues: issues,
        summary: { errors: errorCount, warnings: warningCount },
      });
      
      if (errorCount > 10) {
        logInfo('Showing first 10 errors:');
        issues.filter(i => i.severity === 'error').slice(0, 10).forEach(issue => {
          logError(`  ${issue.file}:${issue.line}:${issue.column} - ${issue.message} (${issue.rule})`);
        });
      }
      
      return false;
    } else if (warningCount > 0) {
      logWarning(`Found ${warningCount} ESLint warnings`);
      report.checks.push({
        name: 'ESLint',
        status: 'warning',
        issues: issues,
        summary: { errors: errorCount, warnings: warningCount },
      });
      return true;
    } else {
      logSuccess('No ESLint issues found');
      report.checks.push({
        name: 'ESLint',
        status: 'passed',
        issues: [],
        summary: { errors: 0, warnings: 0 },
      });
      return true;
    }
  } catch (error) {
    // ESLint exits with non-zero code when there are errors
    if (error.stdout) {
      try {
        const results = JSON.parse(error.stdout);
        let errorCount = 0;
        let warningCount = 0;
        const issues = [];
        
        results.forEach(file => {
          if (file.errorCount > 0 || file.warningCount > 0) {
            errorCount += file.errorCount;
            warningCount += file.warningCount;
            
            file.messages.forEach(message => {
              issues.push({
                file: file.filePath.replace(process.cwd(), ''),
                line: message.line,
                column: message.column,
                severity: message.severity === 2 ? 'error' : 'warning',
                message: message.message,
                rule: message.ruleId,
              });
            });
          }
        });
        
        report.summary.eslintErrors = errorCount;
        report.summary.eslintWarnings = warningCount;
        
        logError(`Found ${errorCount} ESLint errors and ${warningCount} warnings`);
        
        if (errorCount > 10) {
          logInfo('Showing first 10 errors:');
          issues.filter(i => i.severity === 'error').slice(0, 10).forEach(issue => {
            logError(`  ${issue.file}:${issue.line}:${issue.column} - ${issue.message} (${issue.rule})`);
          });
        }
        
        report.checks.push({
          name: 'ESLint',
          status: 'error',
          issues: issues,
          summary: { errors: errorCount, warnings: warningCount },
        });
        
        return false;
      } catch (parseError) {
        logError(`ESLint failed: ${error.message}`);
        report.checks.push({
          name: 'ESLint',
          status: 'error',
          issues: [error.message],
        });
        return false;
      }
    } else {
      logError(`ESLint failed: ${error.message}`);
      report.checks.push({
        name: 'ESLint',
        status: 'error',
        issues: [error.message],
      });
      return false;
    }
  }
}

async function runTypeScript() {
  logSection('3. Running TypeScript Compiler');
  
  try {
    const { stdout, stderr } = await execAsync('npx tsc --noEmit --pretty false', { maxBuffer: 10 * 1024 * 1024 });
    
    logSuccess('No TypeScript errors found');
    report.checks.push({
      name: 'TypeScript',
      status: 'passed',
      issues: [],
    });
    return true;
  } catch (error) {
    if (error.stdout || error.stderr) {
      const output = error.stdout || error.stderr;
      const lines = output.split('\n').filter(line => line.trim());
      const errors = [];
      
      lines.forEach(line => {
        const match = line.match(/^(.+?)\((\d+),(\d+)\): error TS\d+: (.+)$/);
        if (match) {
          errors.push({
            file: match[1].replace(process.cwd(), ''),
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            message: match[4],
          });
        }
      });
      
      report.summary.typeScriptErrors = errors.length;
      
      logError(`Found ${errors.length} TypeScript errors`);
      
      if (errors.length > 10) {
        logInfo('Showing first 10 errors:');
        errors.slice(0, 10).forEach(error => {
          logError(`  ${error.file}:${error.line}:${error.column} - ${error.message}`);
        });
      } else {
        errors.forEach(error => {
          logError(`  ${error.file}:${error.line}:${error.column} - ${error.message}`);
        });
      }
      
      report.checks.push({
        name: 'TypeScript',
        status: 'error',
        issues: errors,
        summary: { errors: errors.length },
      });
      
      return false;
    } else {
      logError(`TypeScript check failed: ${error.message}`);
      report.checks.push({
        name: 'TypeScript',
        status: 'error',
        issues: [error.message],
      });
      return false;
    }
  }
}

async function checkBuildReadiness() {
  logSection('4. Checking Build Readiness');
  
  try {
    // Check if .next directory exists
    const nextDirExists = fs.existsSync(path.join(process.cwd(), '.next'));
    
    if (nextDirExists) {
      logInfo('Previous build artifacts found in .next directory');
    }
    
    // Check for environment variables
    const envExample = path.join(process.cwd(), '.env.example');
    const envLocal = path.join(process.cwd(), '.env.local');
    
    if (fs.existsSync(envExample) && !fs.existsSync(envLocal)) {
      logWarning('No .env.local file found but .env.example exists');
      report.recommendations.push('Create .env.local file based on .env.example');
    }
    
    logSuccess('Build readiness check complete');
    report.checks.push({
      name: 'Build Readiness',
      status: 'passed',
      issues: [],
    });
    
    return true;
  } catch (error) {
    logError(`Build readiness check failed: ${error.message}`);
    report.checks.push({
      name: 'Build Readiness',
      status: 'error',
      issues: [error.message],
    });
    return false;
  }
}

async function generateReport() {
  logSection('Generating Report');
  
  // Calculate total issues
  report.summary.totalIssues = 
    report.summary.eslintErrors + 
    report.summary.eslintWarnings + 
    report.summary.typeScriptErrors;
  
  // Determine if all checks passed
  report.summary.passed = report.checks.every(check => 
    check.status === 'passed' || check.status === 'warning'
  );
  
  // Generate recommendations
  if (report.summary.eslintErrors > 0) {
    report.recommendations.push(`Fix ${report.summary.eslintErrors} ESLint errors`);
  }
  
  if (report.summary.typeScriptErrors > 0) {
    report.recommendations.push(`Fix ${report.summary.typeScriptErrors} TypeScript errors`);
  }
  
  if (report.summary.eslintWarnings > 20) {
    report.recommendations.push('Consider fixing ESLint warnings to improve code quality');
  }
  
  // Write JSON report
  const reportPath = path.join(process.cwd(), 'code-review-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  logInfo(`Detailed report saved to: ${reportPath}`);
  
  // Write HTML report
  const htmlReport = generateHTMLReport();
  const htmlPath = path.join(process.cwd(), 'code-review-report.html');
  fs.writeFileSync(htmlPath, htmlReport);
  logInfo(`HTML report saved to: ${htmlPath}`);
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  log('SUMMARY', colors.bright + colors.magenta);
  console.log('='.repeat(60));
  
  console.log(`Total Issues: ${report.summary.totalIssues}`);
  console.log(`  - ESLint Errors: ${report.summary.eslintErrors}`);
  console.log(`  - ESLint Warnings: ${report.summary.eslintWarnings}`);
  console.log(`  - TypeScript Errors: ${report.summary.typeScriptErrors}`);
  
  if (report.recommendations.length > 0) {
    console.log('\n📋 Recommendations:');
    report.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (report.summary.passed) {
    logSuccess('✨ All critical checks passed! Ready for build.');
  } else {
    logError('❌ Critical issues found. Please fix before building.');
    process.exit(1);
  }
}

function generateHTMLReport() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MixerAI Code Review Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #13599f;
            border-bottom: 3px solid #13599f;
            padding-bottom: 10px;
        }
        h2 {
            color: #333;
            margin-top: 30px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            border: 2px solid #e9ecef;
        }
        .stat-card.error {
            border-color: #dc3545;
            background: #fff5f5;
        }
        .stat-card.warning {
            border-color: #ffc107;
            background: #fffdf5;
        }
        .stat-card.success {
            border-color: #28a745;
            background: #f5fff5;
        }
        .stat-number {
            font-size: 36px;
            font-weight: bold;
            margin: 10px 0;
        }
        .check-result {
            margin: 20px 0;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e9ecef;
        }
        .check-result.passed {
            background: #d4edda;
            border-color: #c3e6cb;
        }
        .check-result.warning {
            background: #fff3cd;
            border-color: #ffeeba;
        }
        .check-result.error {
            background: #f8d7da;
            border-color: #f5c6cb;
        }
        .issue {
            background: #f8f9fa;
            padding: 10px;
            margin: 5px 0;
            border-radius: 4px;
            font-family: monospace;
            font-size: 14px;
        }
        .recommendation {
            background: #e7f3ff;
            border-left: 4px solid #13599f;
            padding: 10px 15px;
            margin: 10px 0;
        }
        .timestamp {
            color: #6c757d;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>MixerAI Code Review Report</h1>
        <p class="timestamp">Generated: ${new Date(report.timestamp).toLocaleString()}</p>
        
        <h2>Summary</h2>
        <div class="summary">
            <div class="stat-card ${report.summary.totalIssues === 0 ? 'success' : 'error'}">
                <div>Total Issues</div>
                <div class="stat-number">${report.summary.totalIssues}</div>
            </div>
            <div class="stat-card ${report.summary.eslintErrors === 0 ? 'success' : 'error'}">
                <div>ESLint Errors</div>
                <div class="stat-number">${report.summary.eslintErrors}</div>
            </div>
            <div class="stat-card ${report.summary.eslintWarnings === 0 ? 'success' : 'warning'}">
                <div>ESLint Warnings</div>
                <div class="stat-number">${report.summary.eslintWarnings}</div>
            </div>
            <div class="stat-card ${report.summary.typeScriptErrors === 0 ? 'success' : 'error'}">
                <div>TypeScript Errors</div>
                <div class="stat-number">${report.summary.typeScriptErrors}</div>
            </div>
        </div>
        
        <h2>Check Results</h2>
        ${report.checks.map(check => `
            <div class="check-result ${check.status}">
                <h3>${check.name} - ${check.status.toUpperCase()}</h3>
                ${check.issues && check.issues.length > 0 ? `
                    <div>Found ${check.issues.length} issues:</div>
                    ${check.issues.slice(0, 20).map(issue => `
                        <div class="issue">
                            ${issue.file ? `${issue.file}:${issue.line}:${issue.column} - ` : ''}
                            ${issue.message || issue}
                        </div>
                    `).join('')}
                    ${check.issues.length > 20 ? `<div>... and ${check.issues.length - 20} more</div>` : ''}
                ` : '<div>✅ No issues found</div>'}
            </div>
        `).join('')}
        
        ${report.recommendations.length > 0 ? `
            <h2>Recommendations</h2>
            ${report.recommendations.map(rec => `
                <div class="recommendation">${rec}</div>
            `).join('')}
        ` : ''}
    </div>
</body>
</html>`;
}

// Main execution
async function main() {
  console.clear();
  log('🔍 MixerAI Code Review Tool', colors.bright + colors.magenta);
  log('Running comprehensive code quality checks...\n', colors.cyan);
  
  try {
    await checkDependencies();
    await runESLint();
    await runTypeScript();
    await checkBuildReadiness();
    await generateReport();
  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main();