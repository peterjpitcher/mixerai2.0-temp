#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files with unused withAuth imports
const filesToClean = [
  'src/app/api/ai/claims/simplify/route.ts',
  'src/app/api/ai/generate/route.ts',
  'src/app/api/ai/generate-title/route.ts',
  'src/app/api/ai/style-brand-claims/route.ts',
  'src/app/api/ai/suggest/route.ts',
  'src/app/api/ai/suggest-replacement-claims/route.ts',
  'src/app/api/content/[id]/regenerate/route.ts',
  'src/app/api/content/[id]/restart-workflow/route.ts',
  'src/app/api/content/[id]/workflow-action/route.ts',
  'src/app/api/content/generate/article-titles/route.ts',
  'src/app/api/content/generate/keywords/route.ts',
  'src/app/api/content/generate-field/route.ts',
  'src/app/api/content/prepare-product-context/route.ts',
  'src/app/api/content/scrape-recipe/route.ts',
  'src/app/api/market-overrides/[overrideId]/route.ts',
  'src/app/api/notifications/[id]/route.ts',
  'src/app/api/product-ingredients/route.ts',
  'src/app/api/notifications/clear/route.ts'
];

// Additional files with other unused imports
const additionalCleanup = {
  'src/app/api/brands/route.ts': ['createErrorResponse', 'createSuccessResponse', 'extractCleanDomain', 'CompensatingTransaction'],
  'src/app/api/content/[id]/regenerate/route.ts': ['ContentData'],
  'src/app/api/content/[id]/workflow-action/route.ts': ['getNextVersionNumber'],
  'src/app/api/content/generate/route.ts': ['withAuthAndCSRF'],
  'src/app/api/tools/alt-text-generator/route.ts': ['withAuthAndCSRF'],
  'src/app/api/tools/content-transcreator/route.ts': ['withAuthAndCSRF'],
  'src/app/api/tools/metadata-generator/route.ts': ['withAuthAndCSRF']
};

console.log('Cleaning up unused imports from CSRF protection changes\n');
console.log('=' .repeat(80));

let successCount = 0;
let failureCount = 0;

// Clean up unused withAuth imports
filesToClean.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    failureCount++;
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Remove withAuth from imports if it's not used
  content = content.replace(/import\s*{\s*([^}]*)\s*}\s*from\s*['"]@\/lib\/auth\/api-auth['"];?/g, (match, imports) => {
    const importList = imports.split(',').map(imp => imp.trim());
    const filteredImports = importList.filter(imp => imp !== 'withAuth');
    
    if (filteredImports.length === 0) {
      return ''; // Remove entire import if empty
    } else if (filteredImports.length < importList.length) {
      return `import { ${filteredImports.join(', ')} } from '@/lib/auth/api-auth';`;
    }
    return match;
  });
  
  // Remove extra blank lines
  content = content.replace(/\n\n\n+/g, '\n\n');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✨ Cleaned: ${filePath}`);
    successCount++;
  }
});

// Clean up additional unused imports
Object.entries(additionalCleanup).forEach(([filePath, unusedImports]) => {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    failureCount++;
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  unusedImports.forEach(unusedImport => {
    // Remove from import statements
    content = content.replace(new RegExp(`import\\s*{([^}]*)}\\s*from\\s*['"][^'"]+['"];?`, 'g'), (match, imports) => {
      const importList = imports.split(',').map(imp => imp.trim());
      const filteredImports = importList.filter(imp => imp !== unusedImport);
      
      if (filteredImports.length === 0) {
        return ''; // Remove entire import if empty
      } else if (filteredImports.length < importList.length) {
        const fromPart = match.match(/from\s*['"][^'"]+['"];?/);
        return `import { ${filteredImports.join(', ')} } ${fromPart}`;
      }
      return match;
    });
  });
  
  // Remove extra blank lines
  content = content.replace(/\n\n\n+/g, '\n\n');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✨ Cleaned additional imports: ${filePath}`);
    successCount++;
  }
});

// Fix specific issue in notifications/clear/route.ts
const clearRouteFile = 'src/app/api/notifications/clear/route.ts';
if (fs.existsSync(clearRouteFile)) {
  let content = fs.readFileSync(clearRouteFile, 'utf8');
  const originalContent = content;
  
  // Fix the unused request parameter
  content = content.replace(
    /export const DELETE = withAuthAndCSRF\(async \(request: NextRequest, user\) => {/,
    'export const DELETE = withAuthAndCSRF(async (_, user) => {'
  );
  
  if (content !== originalContent) {
    fs.writeFileSync(clearRouteFile, content);
    console.log(`✨ Fixed unused parameter: ${clearRouteFile}`);
    successCount++;
  }
}

console.log('\n📊 Summary:');
console.log(`✅ Successfully cleaned: ${successCount}`);
console.log(`❌ Failed: ${failureCount}`);
console.log('\nNote: Some TypeScript "any" errors will need manual fixing.');