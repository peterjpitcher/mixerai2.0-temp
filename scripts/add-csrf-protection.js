#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Critical endpoints to fix first
const criticalEndpoints = [
  'src/app/api/brands/route.ts',
  'src/app/api/brands/[id]/route.ts',
  'src/app/api/users/invite/route.ts',
  'src/app/api/users/[id]/route.ts',
  'src/app/api/content/route.ts',
  'src/app/api/content/[id]/route.ts',
  'src/app/api/workflows/route.ts',
  'src/app/api/workflows/[id]/route.ts',
  'src/app/api/products/route.ts',
  'src/app/api/products/[productId]/route.ts',
  'src/app/api/claims/route.ts',
  'src/app/api/claims/[id]/route.ts',
  'src/app/api/notifications/route.ts',
  'src/app/api/notifications/[id]/route.ts',
  'src/app/api/content-templates/route.ts',
  'src/app/api/content-templates/[id]/route.ts'
];

console.log('Adding CSRF Protection to Critical Endpoints\n');
console.log('=' .repeat(80));

criticalEndpoints.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Check if already has CSRF protection
  if (content.includes('withCSRF') || content.includes('validateCSRFToken')) {
    console.log(`✅ Already protected: ${filePath}`);
    return;
  }
  
  // Check if it uses withAuth
  const usesWithAuth = content.includes('withAuth');
  
  // Add import statement
  if (usesWithAuth && !content.includes('withAuthAndCSRF')) {
    // Add withAuthAndCSRF import
    if (content.includes("from '@/lib/auth/api-auth'")) {
      // Add to existing auth import
      content = content.replace(
        "import { withAuth } from '@/lib/auth/api-auth';",
        "import { withAuth } from '@/lib/auth/api-auth';\nimport { withAuthAndCSRF } from '@/lib/api/with-csrf';"
      );
    } else {
      // Add new import after other imports
      const lastImportMatch = content.match(/import[^;]+;(?=\n(?!import))/);
      if (lastImportMatch) {
        const insertPosition = lastImportMatch.index + lastImportMatch[0].length;
        content = content.slice(0, insertPosition) + 
          "\nimport { withAuthAndCSRF } from '@/lib/api/with-csrf';" + 
          content.slice(insertPosition);
      }
    }
    
    // Replace withAuth with withAuthAndCSRF
    content = content.replace(/export const (POST|PUT|PATCH|DELETE) = withAuth\(/g, 
      'export const $1 = withAuthAndCSRF(');
  } else if (!usesWithAuth) {
    // Add withCSRF import
    const lastImportMatch = content.match(/import[^;]+;(?=\n(?!import))/);
    if (lastImportMatch) {
      const insertPosition = lastImportMatch.index + lastImportMatch[0].length;
      content = content.slice(0, insertPosition) + 
        "\nimport { withCSRF } from '@/lib/api/with-csrf';" + 
        content.slice(insertPosition);
    }
    
    // Wrap handlers with withCSRF
    content = content.replace(
      /export const (POST|PUT|PATCH|DELETE) = async \(/g, 
      'export const $1 = withCSRF(async ('
    );
    
    // Add closing parenthesis for withCSRF
    const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    methods.forEach(method => {
      const regex = new RegExp(`export const ${method} = withCSRF\\(async \\([^)]+\\)[^}]+\\}\\);?`, 'g');
      content = content.replace(regex, (match) => {
        if (match.endsWith(';')) {
          return match.slice(0, -1) + ');';
        } else {
          return match + ')';
        }
      });
    });
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✨ Added CSRF protection: ${filePath}`);
  } else {
    console.log(`⚠️  Could not add protection: ${filePath} (manual intervention needed)`);
  }
});

console.log('\n📝 Note: This script only handles basic cases. Complex handlers may need manual updates.');
console.log('Please review the changes and test thoroughly.');