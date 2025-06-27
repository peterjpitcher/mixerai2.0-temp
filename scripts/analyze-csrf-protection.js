#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all route.ts files in the API directory
const apiRoutes = glob.sync('src/app/api/**/route.ts');

console.log('Analyzing CSRF Protection in API Routes\n');
console.log('=' .repeat(80));

const results = {
  protected: [],
  unprotected: [],
  publicRoutes: []
};

// Public routes that don't need CSRF protection
const publicRoutePatterns = [
  '/api/auth/',
  '/api/env-check',
  '/api/test-connection',
  '/api/test-metadata-generator',
  '/api/brands/identity',
  '/api/webhooks/'
];

apiRoutes.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const routePath = file.replace('src/app', '').replace('/route.ts', '');
  
  // Check if it's a public route
  const isPublic = publicRoutePatterns.some(pattern => routePath.includes(pattern));
  
  // Check for mutation methods
  const hasPOST = content.includes('export const POST') || content.includes('export async function POST');
  const hasPUT = content.includes('export const PUT') || content.includes('export async function PUT');
  const hasPATCH = content.includes('export const PATCH') || content.includes('export async function PATCH');
  const hasDELETE = content.includes('export const DELETE') || content.includes('export async function DELETE');
  
  const hasMutations = hasPOST || hasPUT || hasPATCH || hasDELETE;
  
  if (!hasMutations) {
    return; // Skip read-only routes
  }
  
  // Check for CSRF validation
  const hasCSRFImport = content.includes('validateCSRFToken') || content.includes('withCSRF') || content.includes('withAuthAndCSRF');
  const hasCSRFValidation = content.includes('validateCSRFToken(') || content.includes('withCSRF(') || content.includes('withAuthAndCSRF(');
  
  const methods = [];
  if (hasPOST) methods.push('POST');
  if (hasPUT) methods.push('PUT');
  if (hasPATCH) methods.push('PATCH');
  if (hasDELETE) methods.push('DELETE');
  
  const routeInfo = {
    path: routePath,
    file: file,
    methods: methods,
    hasCSRFProtection: hasCSRFImport && hasCSRFValidation
  };
  
  if (isPublic) {
    results.publicRoutes.push(routeInfo);
  } else if (routeInfo.hasCSRFProtection) {
    results.protected.push(routeInfo);
  } else {
    results.unprotected.push(routeInfo);
  }
});

// Display results
console.log('\n🛡️  PROTECTED ROUTES (with CSRF):');
console.log('-'.repeat(80));
results.protected.forEach(route => {
  console.log(`✅ ${route.path} [${route.methods.join(', ')}]`);
});

console.log('\n⚠️  UNPROTECTED ROUTES (need CSRF):');
console.log('-'.repeat(80));
results.unprotected.forEach(route => {
  console.log(`❌ ${route.path} [${route.methods.join(', ')}]`);
});

console.log('\n🌐 PUBLIC ROUTES (no CSRF needed):');
console.log('-'.repeat(80));
results.publicRoutes.forEach(route => {
  console.log(`➖ ${route.path} [${route.methods.join(', ')}]`);
});

console.log('\n📊 SUMMARY:');
console.log('-'.repeat(80));
console.log(`Protected routes: ${results.protected.length}`);
console.log(`Unprotected routes: ${results.unprotected.length}`);
console.log(`Public routes: ${results.publicRoutes.length}`);
console.log(`\nTotal mutation endpoints needing protection: ${results.unprotected.length}`);

// Generate fix list
if (results.unprotected.length > 0) {
  console.log('\n📝 ROUTES TO FIX:');
  console.log('-'.repeat(80));
  results.unprotected.forEach(route => {
    console.log(`\n${route.file}`);
    console.log(`Methods: ${route.methods.join(', ')}`);
    console.log('Add: import { validateCSRFToken } from "@/lib/csrf";');
    console.log('Add validation in each method handler');
  });
}