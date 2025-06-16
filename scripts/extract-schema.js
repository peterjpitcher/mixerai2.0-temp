#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the dump file
const dumpPath = path.join(__dirname, '..', 'supabase_schema.sql');
const outputPath = path.join(__dirname, '..', 'migrations', '20250116_initial_schema.sql');

const content = fs.readFileSync(dumpPath, 'utf8');
const lines = content.split('\n');

let output = [];
let inDataSection = false;
let currentStatement = [];
let skipNextStatement = false;

// Add header
output.push('--');
output.push('-- MixerAI 2.0 Initial Schema');
output.push('-- Generated from Supabase dump on ' + new Date().toISOString());
output.push('--');
output.push('');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmedLine = line.trim();
  
  // Skip data sections
  if (trimmedLine.startsWith('COPY ') || trimmedLine.startsWith('\\copy')) {
    inDataSection = true;
    continue;
  }
  
  if (inDataSection && trimmedLine === '\\.') {
    inDataSection = false;
    continue;
  }
  
  if (inDataSection) {
    continue;
  }
  
  // Skip certain statements
  if (trimmedLine.startsWith('SELECT pg_catalog.setval(')) {
    continue;
  }
  
  // Skip extension creation for certain extensions that are auto-created
  if (trimmedLine.includes('CREATE EXTENSION') && 
      (trimmedLine.includes('"uuid-ossp"') || 
       trimmedLine.includes('"pgsodium"') ||
       trimmedLine.includes('"supabase_vault"'))) {
    skipNextStatement = true;
  }
  
  // Include the line
  if (!skipNextStatement) {
    output.push(line);
  }
  
  if (line.endsWith(';') && !line.startsWith('--')) {
    skipNextStatement = false;
  }
}

// Write the cleaned schema
fs.writeFileSync(outputPath, output.join('\n'));

console.log(`Schema extracted to: ${outputPath}`);
console.log(`Original lines: ${lines.length}`);
console.log(`Output lines: ${output.length}`);