#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files that need return type fixes
const filesToFix = [
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
  'src/app/api/product-ingredients/route.ts',
  'src/app/api/workflows/generate-description/route.ts',
  'src/app/api/workflows/[id]/invitations/route.ts',
  'src/app/api/workflows/[id]/duplicate/route.ts',
  'src/app/api/users/fix-role/route.ts',
  'src/app/api/master-claim-brands/route.ts',
  'src/app/api/master-claim-brands/[id]/route.ts',
  'src/app/api/market-overrides/route.ts',
  'src/app/api/ingredients/route.ts',
  'src/app/api/ingredients/[id]/route.ts',
  'src/app/api/claims/workflows/route.ts',
  'src/app/api/claims/workflows/[id]/route.ts',
  'src/app/api/claims/[id]/workflow/route.ts',
  'src/app/api/ai/generate-workflow-description/route.ts',
  'src/app/api/ai/generate-template-description/route.ts',
  'src/app/api/ai/generate-step-description/route.ts'
];

console.log('Fixing CSRF handler return types\n');
console.log('=' .repeat(80));

let successCount = 0;
let failureCount = 0;

filesToFix.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    failureCount++;
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Fix withCSRF handlers
  content = content.replace(
    /export const (POST|PUT|PATCH|DELETE) = withCSRF\(async (?:function )?\((.*?)\)(?:\s*:\s*Promise<[^>]+>)?\s*=>\s*{/g,
    'export const $1 = withCSRF(async ($2): Promise<NextResponse> => {'
  );
  
  // Fix withAuthAndCSRF handlers
  content = content.replace(
    /export const (POST|PUT|PATCH|DELETE) = withAuthAndCSRF\(async (?:function )?\((.*?)\)(?:\s*:\s*Promise<[^>]+>)?\s*=>\s*{/g,
    'export const $1 = withAuthAndCSRF(async ($2): Promise<NextResponse> => {'
  );
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✨ Fixed return types: ${filePath}`);
    successCount++;
  } else {
    console.log(`ℹ️  No changes needed: ${filePath}`);
  }
});

console.log('\n📊 Summary:');
console.log(`✅ Successfully fixed: ${successCount}`);
console.log(`❌ Failed: ${failureCount}`);