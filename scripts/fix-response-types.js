#!/usr/bin/env node

const fs = require('fs');
const glob = require('glob');

// Find all route.ts files that use withCSRF or withAuthAndCSRF
const routeFiles = glob.sync('src/app/api/**/route.ts');

console.log('Fixing Response types in route handlers\n');
console.log('=' .repeat(80));

let successCount = 0;

routeFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Replace Promise<NextResponse> with Promise<Response>
  content = content.replace(/: Promise<NextResponse>/g, ': Promise<Response>');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✨ Fixed response type: ${filePath}`);
    successCount++;
  }
});

console.log(`\n📊 Fixed ${successCount} files`);