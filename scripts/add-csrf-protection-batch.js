#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Remaining endpoints to fix
const remainingEndpoints = [
  'src/app/api/workflows/generate-description/route.ts',
  'src/app/api/workflows/[id]/invitations/route.ts',
  'src/app/api/workflows/[id]/duplicate/route.ts',
  'src/app/api/users/resend-invite/route.ts',
  'src/app/api/users/invite/route.ts',
  'src/app/api/users/fix-role/route.ts',
  'src/app/api/users/[id]/route.ts',
  'src/app/api/user/notification-settings/route.ts',
  'src/app/api/tools/metadata-generator/route.ts',
  'src/app/api/tools/content-transcreator/route.ts',
  'src/app/api/tools/alt-text-generator/route.ts',
  'src/app/api/product-ingredients/route.ts',
  'src/app/api/notifications/mark-read/route.ts',
  'src/app/api/notifications/email/route.ts',
  'src/app/api/notifications/clear/route.ts',
  'src/app/api/master-claim-brands/route.ts',
  'src/app/api/master-claim-brands/[id]/route.ts',
  'src/app/api/market-overrides/route.ts',
  'src/app/api/market-overrides/[overrideId]/route.ts',
  'src/app/api/ingredients/route.ts',
  'src/app/api/ingredients/[id]/route.ts',
  'src/app/api/content/scrape-recipe/route.ts',
  'src/app/api/content/prepare-product-context/route.ts',
  'src/app/api/content/generate-field/route.ts',
  'src/app/api/content/generate/route.ts',
  'src/app/api/content/generate/keywords/route.ts',
  'src/app/api/content/generate/article-titles/route.ts',
  'src/app/api/content/[id]/workflow-action/route.ts',
  'src/app/api/content/[id]/restart-workflow/route.ts',
  'src/app/api/content/[id]/regenerate/route.ts',
  'src/app/api/claims/workflows/route.ts',
  'src/app/api/claims/workflows/[id]/route.ts',
  'src/app/api/claims/[id]/workflow/route.ts',
  'src/app/api/ai/suggest-replacement-claims/route.ts',
  'src/app/api/ai/suggest/route.ts',
  'src/app/api/ai/style-brand-claims/route.ts',
  'src/app/api/ai/generate-workflow-description/route.ts',
  'src/app/api/ai/generate-title/route.ts',
  'src/app/api/ai/generate-template-description/route.ts',
  'src/app/api/ai/generate-step-description/route.ts',
  'src/app/api/ai/generate/route.ts',
  'src/app/api/ai/claims/simplify/route.ts'
];

console.log('Adding CSRF Protection to Remaining Endpoints\n');
console.log('=' .repeat(80));

let successCount = 0;
let failureCount = 0;

remainingEndpoints.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    failureCount++;
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Check if already has CSRF protection
  if (content.includes('withCSRF') || content.includes('withAuthAndCSRF') || content.includes('validateCSRFToken')) {
    console.log(`✅ Already protected: ${filePath}`);
    successCount++;
    return;
  }
  
  // Check if it uses withAuth
  const usesWithAuth = content.includes('withAuth');
  const hasWithAuthImport = content.includes("from '@/lib/auth/api-auth'") || content.includes("from '@/lib/auth/middleware'");
  
  // Determine which wrapper to use
  if (usesWithAuth && hasWithAuthImport) {
    // Add withAuthAndCSRF import
    if (!content.includes('withAuthAndCSRF')) {
      // Find the last import statement
      const importMatches = content.match(/import[^;]+;/g);
      if (importMatches && importMatches.length > 0) {
        const lastImport = importMatches[importMatches.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertPosition = lastImportIndex + lastImport.length;
        
        content = content.slice(0, insertPosition) + 
          "\nimport { withAuthAndCSRF } from '@/lib/api/with-csrf';" + 
          content.slice(insertPosition);
      }
    }
    
    // Replace withAuth with withAuthAndCSRF for mutation methods
    const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    methods.forEach(method => {
      const regex = new RegExp(`export const ${method} = withAuth\\(`, 'g');
      if (content.match(regex)) {
        content = content.replace(regex, `export const ${method} = withAuthAndCSRF(`);
      }
    });
  } else {
    // Add withCSRF import for non-auth routes
    if (!content.includes('withCSRF')) {
      const importMatches = content.match(/import[^;]+;/g);
      if (importMatches && importMatches.length > 0) {
        const lastImport = importMatches[importMatches.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertPosition = lastImportIndex + lastImport.length;
        
        content = content.slice(0, insertPosition) + 
          "\nimport { withCSRF } from '@/lib/api/with-csrf';" + 
          content.slice(insertPosition);
      }
    }
    
    // Wrap handlers with withCSRF
    const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    methods.forEach(method => {
      // Handle various export patterns
      const patterns = [
        // Pattern 1: export const METHOD = async (
        {
          regex: new RegExp(`export const ${method} = async \\(`, 'g'),
          replacement: `export const ${method} = withCSRF(async (`
        },
        // Pattern 2: export async function METHOD(
        {
          regex: new RegExp(`export async function ${method}\\(`, 'g'),
          replacement: `export const ${method} = withCSRF(async function (`
        }
      ];
      
      patterns.forEach(pattern => {
        if (content.match(pattern.regex)) {
          content = content.replace(pattern.regex, pattern.replacement);
          
          // Find the end of the function and add closing parenthesis
          // This is a simple approach - may need manual adjustment for complex functions
          const functionStart = content.indexOf(pattern.replacement);
          if (functionStart !== -1) {
            // Find the matching closing brace
            let braceCount = 0;
            let inString = false;
            let stringChar = '';
            let i = functionStart;
            
            for (; i < content.length; i++) {
              if (!inString) {
                if (content[i] === '"' || content[i] === "'" || content[i] === '`') {
                  inString = true;
                  stringChar = content[i];
                } else if (content[i] === '{') {
                  braceCount++;
                } else if (content[i] === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                    // Found the closing brace
                    // Check if there's a semicolon after
                    let insertPos = i + 1;
                    while (insertPos < content.length && /\s/.test(content[insertPos])) {
                      insertPos++;
                    }
                    if (content[insertPos] === ';') {
                      content = content.slice(0, insertPos) + ')' + content.slice(insertPos);
                    } else {
                      content = content.slice(0, i + 1) + ')' + content.slice(i + 1);
                    }
                    break;
                  }
                }
              } else {
                if (content[i] === stringChar && content[i - 1] !== '\\') {
                  inString = false;
                }
              }
            }
          }
        }
      });
    });
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✨ Added CSRF protection: ${filePath}`);
    successCount++;
  } else {
    console.log(`⚠️  Could not add protection: ${filePath} (manual intervention needed)`);
    failureCount++;
  }
});

console.log('\n📊 Summary:');
console.log(`✅ Successfully protected: ${successCount}`);
console.log(`❌ Failed/Manual needed: ${failureCount}`);
console.log('\n📝 Note: Complex handlers may need manual adjustment.');
console.log('Please review the changes and test thoroughly.');