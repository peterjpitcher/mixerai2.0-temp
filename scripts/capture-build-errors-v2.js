#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, 'build-errors-detailed.log');
const jsonFile = path.join(__dirname, 'build-errors-detailed.json');

console.log('Running build and capturing errors...');

// Run the build command and capture output
exec('npm run build 2>&1', { maxBuffer: 10 * 1024 * 1024 }, (error, output) => {
  let logContent = '';
  
  // Add header
  logContent += `Build Error Report\n`;
  logContent += `Generated: ${new Date().toISOString()}\n`;
  logContent += `${'='.repeat(80)}\n\n`;
  
  // Add full output
  logContent += 'FULL OUTPUT:\n';
  logContent += output;
  logContent += '\n\n';
  
  // Parse TypeScript errors
  const errors = [];
  const lines = output.split('\n');
  
  // Pattern to match TypeScript errors
  const errorPattern = /^\.\/(.+):(\d+):(\d+)$/;
  const typeErrorPattern = /Type error: (.+)/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line is a file:line:column pattern
    const fileMatch = line.match(errorPattern);
    if (fileMatch && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const errorMatch = nextLine.match(typeErrorPattern);
      
      if (errorMatch) {
        const error = {
          file: fileMatch[0],
          filePath: fileMatch[1],
          line: parseInt(fileMatch[2]),
          column: parseInt(fileMatch[3]),
          message: errorMatch[1],
          fullError: nextLine,
          context: []
        };
        
        // Capture context lines (usually the next 5-10 lines show code context)
        for (let j = i + 2; j < Math.min(i + 12, lines.length); j++) {
          if (lines[j].match(errorPattern)) break; // Stop if we hit another error
          if (lines[j].trim()) {
            error.context.push(lines[j]);
          }
        }
        
        errors.push(error);
      }
    }
  }
  
  // Add error summary to log
  logContent += `${'='.repeat(80)}\n`;
  logContent += `TYPESCRIPT ERRORS SUMMARY (${errors.length} errors found):\n`;
  logContent += `${'='.repeat(80)}\n\n`;
  
  errors.forEach((err, index) => {
    logContent += `Error ${index + 1}:\n`;
    logContent += `File: ${err.file}\n`;
    logContent += `Message: ${err.message}\n`;
    logContent += `Context:\n${err.context.slice(0, 5).join('\n')}\n`;
    logContent += '\n' + '-'.repeat(40) + '\n\n';
  });
  
  // Create simplified error list
  const simplifiedErrors = errors.map(err => ({
    file: err.filePath,
    line: err.line,
    column: err.column,
    error: err.message,
    category: categorizeError(err.message)
  }));
  
  // Group errors by category
  const errorsByCategory = {};
  simplifiedErrors.forEach(err => {
    if (!errorsByCategory[err.category]) {
      errorsByCategory[err.category] = [];
    }
    errorsByCategory[err.category].push(err);
  });
  
  logContent += `ERRORS BY CATEGORY:\n`;
  logContent += `${'='.repeat(80)}\n\n`;
  
  Object.entries(errorsByCategory).forEach(([category, errs]) => {
    logContent += `${category} (${errs.length} errors):\n`;
    errs.forEach(err => {
      logContent += `  - ${err.file}:${err.line} - ${err.error.substring(0, 100)}${err.error.length > 100 ? '...' : ''}\n`;
    });
    logContent += '\n';
  });
  
  // Write log file
  fs.writeFileSync(outputFile, logContent);
  
  // Write JSON file
  const jsonOutput = {
    timestamp: new Date().toISOString(),
    success: error ? false : true,
    totalErrors: errors.length,
    errorsByCategory,
    errors: simplifiedErrors,
    fullErrors: errors
  };
  
  fs.writeFileSync(jsonFile, JSON.stringify(jsonOutput, null, 2));
  
  console.log(`\nBuild errors have been captured to:`);
  console.log(`  Log file: ${outputFile}`);
  console.log(`  JSON file: ${jsonFile}`);
  console.log(`\nTotal TypeScript errors found: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\nError categories:');
    Object.entries(errorsByCategory).forEach(([category, errs]) => {
      console.log(`  ${category}: ${errs.length} errors`);
    });
  }
});

function categorizeError(message) {
  if (message.includes('is not assignable to type')) return 'Type Mismatch';
  if (message.includes('Cannot find name')) return 'Undefined Reference';
  if (message.includes('is not assignable to parameter')) return 'Parameter Type Mismatch';
  if (message.includes('Property') && message.includes('does not exist')) return 'Missing Property';
  if (message.includes('Expected')) return 'Syntax Error';
  if (message.includes('No overload matches')) return 'Overload Error';
  if (message.includes('Conversion of type')) return 'Type Conversion Error';
  if (message.includes('is defined but never used')) return 'Unused Variable';
  return 'Other';
}