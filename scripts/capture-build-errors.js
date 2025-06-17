#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, 'build-errors.log');

console.log('Running build and capturing errors...');

// Run the build command and capture output
const buildProcess = exec('npm run build', (error, stdout, stderr) => {
  let output = '';
  
  // Add timestamp
  output += `Build Error Report\n`;
  output += `Generated: ${new Date().toISOString()}\n`;
  output += `${'='.repeat(80)}\n\n`;
  
  // Add stdout (which includes TypeScript errors in Next.js builds)
  if (stdout) {
    output += 'STDOUT:\n';
    output += stdout;
    output += '\n\n';
  }
  
  // Add stderr
  if (stderr) {
    output += 'STDERR:\n';
    output += stderr;
    output += '\n\n';
  }
  
  // Add error object if present
  if (error) {
    output += 'ERROR OBJECT:\n';
    output += JSON.stringify(error, null, 2);
    output += '\n\n';
  }
  
  // Extract just TypeScript errors
  const tsErrors = [];
  const lines = stdout.split('\n');
  let currentError = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect TypeScript error start
    if (line.includes('Type error:') || line.includes('Error:')) {
      if (currentError) {
        tsErrors.push(currentError);
      }
      currentError = {
        file: '',
        error: line,
        context: []
      };
      
      // Look for file path in previous line
      if (i > 0 && lines[i-1].match(/^\.\/[^\s]+:\d+:\d+$/)) {
        currentError.file = lines[i-1];
      }
    } else if (currentError && line.trim() && !line.includes('▲ Next.js')) {
      currentError.context.push(line);
    } else if (currentError && line.trim() === '') {
      tsErrors.push(currentError);
      currentError = null;
    }
  }
  
  if (currentError) {
    tsErrors.push(currentError);
  }
  
  // Add summary of TypeScript errors
  output += `${'='.repeat(80)}\n`;
  output += `TYPESCRIPT ERRORS SUMMARY (${tsErrors.length} errors found):\n`;
  output += `${'='.repeat(80)}\n\n`;
  
  tsErrors.forEach((err, index) => {
    output += `Error ${index + 1}:\n`;
    output += `File: ${err.file}\n`;
    output += `Error: ${err.error}\n`;
    if (err.context.length > 0) {
      output += `Context:\n${err.context.join('\n')}\n`;
    }
    output += '\n';
  });
  
  // Write to file
  fs.writeFileSync(outputFile, output);
  
  console.log(`\nBuild errors have been captured to: ${outputFile}`);
  console.log(`Total TypeScript errors found: ${tsErrors.length}`);
  
  // Also create a simplified JSON version for programmatic use
  const jsonOutput = {
    timestamp: new Date().toISOString(),
    totalErrors: tsErrors.length,
    errors: tsErrors
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'build-errors.json'),
    JSON.stringify(jsonOutput, null, 2)
  );
  
  console.log(`JSON version saved to: build-errors.json`);
});

// Stream output to console as well
buildProcess.stdout.pipe(process.stdout);
buildProcess.stderr.pipe(process.stderr);