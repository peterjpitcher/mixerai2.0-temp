# Recipe Scraper 403 Error Fix

## Problem
The recipe scraper was returning 403/400 errors when trying to fetch recipes from external URLs.

## Root Causes Identified

### 1. Missing CSRF Token Initialization (Primary Issue)
The `CSRFInitializer` component was never added to the root layout, causing all POST requests to fail with 403 errors due to missing CSRF tokens.

### 2. External Website Blocking
Some websites block automated scraping attempts based on headers and user agents.

## Solutions Implemented

### 1. Added CSRF Token Initialization
**File**: `/src/app/layout.tsx`
- Imported and added `CSRFInitializer` component
- Ensures CSRF token is initialized when the app loads
- Token is now properly included in all POST requests via `apiFetch`

### 2. Enhanced Recipe Scraper Headers
**File**: `/src/app/api/content/scrape-recipe/route.ts`
- Updated User-Agent to Chrome 120 (more recent)
- Added comprehensive browser headers to mimic real browser requests
- Added timeout handling (10 seconds) to prevent hanging requests
- Improved error messages for better user feedback

### 3. Better Error Handling
- Added specific error messages for different HTTP status codes
- Handle network errors and timeouts gracefully
- Provide actionable error messages to users

## Changes Made

### Layout Changes
```typescript
// src/app/layout.tsx
import { CSRFInitializer } from "@/components/csrf-initializer";

// Added in body:
<body className={inter.className}>
  <CSRFInitializer />
  {/* ... rest of app */}
</body>
```

### API Route Improvements
- Added timeout control with AbortController
- Enhanced headers to avoid 403 blocks
- Better error messages for users
- Specific handling for 403, 404, and 500+ errors

## Testing Recommendations

1. **Clear browser cookies** to ensure fresh CSRF token generation
2. **Test with various recipe sites**:
   - AllRecipes
   - Food Network  
   - BBC Good Food
   - Serious Eats
3. **Monitor for specific error messages** to identify problematic sites

## Known Limitations

Some websites may still block scraping due to:
- CloudFlare or similar protection services
- IP-based rate limiting
- Sophisticated bot detection

For these sites, users should be advised to:
- Copy recipe content manually
- Try alternative recipe websites
- Use sites known to work with the scraper

## Future Improvements

Consider implementing:
1. **Proxy support** for bypassing IP blocks
2. **Site-specific parsers** for popular recipe websites
3. **Caching mechanism** to reduce repeated fetches
4. **Alternative scraping methods** (e.g., using a headless browser service)