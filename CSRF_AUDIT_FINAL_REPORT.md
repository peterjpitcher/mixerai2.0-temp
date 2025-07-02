# CSRF Protection Audit - Final Report

## Executive Summary

After a comprehensive audit of the entire codebase, I have identified **CRITICAL CSRF vulnerabilities** that need immediate attention. Multiple components and hooks are making direct `fetch()` calls for mutation operations without CSRF protection.

## Critical Issues Found

### 1. Client-Side Components Making Unprotected Mutations

#### `/src/app/dashboard/claims/definitions/page.tsx`
- **Line 16**: Direct POST to `/api/claims` without CSRF token
- **Risk**: High - Creating claims without CSRF protection

#### `/src/components/ui/error-boundary.tsx`
- **Line 35**: Direct POST to `/api/errors/track` 
- **Note**: Has manual CSRF implementation but should use apiFetch for consistency

#### `/src/hooks/use-content-generator.ts`
- **Line 255**: Direct POST to `/api/content/generate` without CSRF
- **Line 310**: Direct POST to `/api/ai/generate-title` without CSRF
- **Line 375**: Direct POST to `/api/content` without CSRF
- **Risk**: CRITICAL - Content generation and creation endpoints exposed

#### `/src/lib/error-tracking.ts`
- **Line 48**: Direct POST to `/api/errors/track`
- **Note**: Has manual CSRF implementation but should use apiFetch

### 2. API Routes Making Internal Fetch Calls

Multiple API routes are making internal fetch calls to other API routes, which is an anti-pattern and bypasses CSRF protection:

#### High Risk Routes:
- `/src/app/api/workflows/route.ts` (Line 248): POST to internal API
- `/src/app/api/workflows/[id]/route.ts` (Line 301): POST to internal API
- `/src/app/api/content/[id]/workflow-action/route.ts` (Lines 170, 210): POST to internal API
- `/src/app/api/content-templates/route.ts` (Line 233): POST to internal API
- `/src/app/api/content-templates/[id]/route.ts` (Line 167): POST to internal API

### 3. Azure OpenAI Direct Calls

#### `/src/lib/azure/openai.ts`
Multiple direct fetch calls to Azure OpenAI API (Lines 98, 535, 724, 906, 1046, 1181, 1300, 1418)
- **Note**: These are external API calls and don't need CSRF, but mentioned for completeness

## Verification Commands

To verify these issues:

```bash
# Find all fetch calls with mutations in client components
grep -r "fetch.*method.*['\"]POST\|PUT\|DELETE\|PATCH" src/app/dashboard src/components src/hooks --include="*.tsx" --include="*.ts"

# Check if apiFetch is imported in files with mutations
for file in $(grep -l "method.*['\"]POST\|PUT\|DELETE\|PATCH" src/**/*.tsx); do
  echo "=== $file ==="
  grep "import.*apiFetch" "$file" || echo "NO APIFETCH IMPORT"
done
```

## Immediate Actions Required

### 1. Fix Critical Client Components

All the following files need to import and use `apiFetch` instead of `fetch`:

```typescript
import { apiFetch } from '@/lib/api-client';

// Replace
const response = await fetch('/api/...', {
  method: 'POST',
  ...
});

// With
const response = await apiFetch('/api/...', {
  method: 'POST',
  ...
});
```

### 2. Refactor Internal API Calls

API routes should NOT make fetch calls to other internal API routes. Instead:
- Extract shared logic into utility functions
- Call the utility functions directly from both routes
- This avoids the overhead and security issues of internal HTTP calls

### 3. Update Error Tracking

While error-boundary.tsx and error-tracking.ts have manual CSRF implementation, they should use apiFetch for consistency.

## Risk Assessment

**SEVERITY: CRITICAL**

The following high-value operations are currently vulnerable to CSRF attacks:
- Content generation and creation
- Claim definitions
- Workflow modifications
- Template updates

An attacker could potentially:
- Create unauthorized content
- Modify workflows
- Define new claims
- Consume AI API credits

## Recommended Timeline

1. **IMMEDIATE (Within 24 hours)**: Fix all client-side mutations
2. **HIGH PRIORITY (Within 48 hours)**: Refactor internal API calls
3. **MEDIUM PRIORITY (Within 1 week)**: Standardize all fetch calls to use apiFetch

## Verification After Fixes

After implementing fixes, run:

```bash
# Verify no direct fetch calls for mutations remain
grep -r "fetch(" src/ --include="*.tsx" --include="*.ts" | grep -E "method.*['\"]?(POST|PUT|DELETE|PATCH)" | grep -v "apiFetch" | grep -v "Azure" | grep -v "external"

# Verify all mutation endpoints use apiFetch
grep -r "POST\|PUT\|DELETE\|PATCH" src/ --include="*.tsx" --include="*.ts" | grep -B2 -A2 "fetch("
```

## Conclusion

This audit reveals critical CSRF vulnerabilities that need immediate attention. The good news is that the infrastructure (apiFetch) is already in place - we just need to ensure it's used consistently across the entire codebase.