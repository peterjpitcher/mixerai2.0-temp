# Fix Plan: Multiple Issues

## 1. Workflow Handling When Content Templates Are Deleted ✅ INVESTIGATED

**Current Behavior:**
- Workflows are NOT cascade deleted when templates are removed
- Workflows have `ON DELETE SET NULL` foreign key constraint
- Content items are automatically rejected when their template is deleted
- Orphaned workflows can continue to function without templates

**No changes needed** - The current behavior is appropriate and preserves data integrity.

## 2. Remove Claims Definitions Page

**Issue:** The claims definitions page at `/dashboard/claims/definitions` is redundant.

**Plan:**
1. Delete the page file: `/src/app/dashboard/claims/definitions/page.tsx`
2. Remove any navigation links to this page from:
   - Unified navigation configuration
   - Any other pages that might link to it
3. Ensure all claim creation flows use `/dashboard/claims/new` instead

**Files to modify:**
- DELETE: `/src/app/dashboard/claims/definitions/page.tsx`
- UPDATE: Navigation configuration files

## 3. Fix Country Storage Issue in Claims Creation

**Issue:** Country is not being stored when creating claims through `/dashboard/claims/new`

**Plan:**
1. Investigate the claim creation form to see if country field is present
2. Check the API endpoint to ensure country_code is being saved
3. Fix any missing country_code handling in the form or API

**Files to investigate:**
- `/src/app/dashboard/claims/new/page.tsx`
- `/src/app/api/claims/route.ts`

## 4. Fix Alt-Text Generator SVG Errors

**Issue:** Azure OpenAI API returns "Invalid image data" for SVG images

**Cause:** Azure OpenAI Vision API doesn't support SVG format

**Plan:**
1. Add SVG detection before sending to Azure OpenAI
2. Either:
   - Skip SVG images with appropriate message
   - Convert SVG to PNG/JPG before processing (complex)
3. Implement proper error handling for unsupported formats

**Files to modify:**
- `/src/app/api/tools/alt-text-generator/route.ts`
- `/src/lib/azure/alt-text-generator.ts` (if exists)

**Implementation approach:**
```typescript
// Detect SVG by URL or content-type
if (imageUrl.toLowerCase().endsWith('.svg') || 
    contentType?.includes('svg')) {
  return {
    error: 'SVG images are not supported by the AI vision model. Please use PNG, JPG, or other raster image formats.'
  };
}
```

## 5. Remove Release Notes from Navigation

**Issue:** Remove `/release-notes` page from unified navigation

**Plan:**
1. Find the unified navigation configuration
2. Remove the release notes entry
3. Verify no broken links remain

**Files to modify:**
- Navigation configuration file (likely in `/src/lib/navigation` or similar)

## Testing Plan

After implementing all fixes:
1. Run `npm run lint:fix` to fix any formatting issues
2. Run `npm run check` to verify TypeScript and linting
3. Run `npm test` to ensure tests pass
4. Run `npm run build` to verify production build
5. Manual testing:
   - Verify claims definitions page is gone
   - Test creating a claim and verify country is saved
   - Test alt-text generator with SVG and non-SVG images
   - Verify release notes is removed from navigation