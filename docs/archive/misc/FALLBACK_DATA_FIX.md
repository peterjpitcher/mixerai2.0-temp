# Fixing Fallback Data Issues in Production

## Problem

The MixerAI 2.0 application is showing dummy/fallback data when deployed to production instead of real data from the database. This is happening because of several defensive mechanisms that were implemented to handle database connection failures but are now preventing real data from being displayed.

## Root Causes

1. **Automatic Fallback Data in API Routes**: API routes like `content`, `workflows`, and `brands` have logic that returns fallback data in production environments or when there's a database error.

2. **Client-side API Fallback Script**: The main layout includes a script that intercepts API requests and provides fallback data if the actual API endpoints fail.

3. **Build vs Runtime Data Handling**: Some routes conditionally return mock data during the build phase but may not be properly handling runtime vs. build-time environments.

## Solution Approach

### 1. Update API Routes

Modify all API routes to follow these principles:

- Only return fallback data when there's an actual database connection error, not automatically in production
- Use the `process.env.NEXT_PHASE === 'phase-production-build'` check to provide mock data during build time only
- Improve error handling to give clearer diagnostics about why fallbacks are being used

API Routes to update:
- `/api/brands/route.ts`
- `/api/brands/[id]/route.ts`
- `/api/content/route.ts`
- `/api/workflows/route.ts`
- `/api/content-types/route.ts`

### 2. Update Client-side Fallback Script

The script in `layout.tsx` is currently too aggressive in providing fallbacks. 
We should:

- Make it only provide fallbacks for genuine 500-level errors
- Improve logging to make it clear when fallbacks are being used
- Consider making it possible to disable the fallback entirely via an environment variable

### 3. Improve Error Handling Utility

Update `lib/api-utils.ts` to:
- Better differentiate between different types of errors
- Log more detailed diagnostics
- Only count specific database connection errors as reasons to use fallback data

## Implementation Steps

1. Update the `isProduction()` usage in API routes to only be part of error handling, not automatic fallback triggers
2. Update error handling in API routes to only use fallbacks for genuine database connection issues
3. Modify the client-side script to be less aggressive with fallbacks
4. Add better logging throughout
5. Test in staging/production environment

## Testing Plan

1. Test each API route individually with network monitoring to verify actual data is being returned
2. Test with a working database connection to ensure real data is always shown
3. Test with a disabled database connection to verify fallbacks work as a safety net
4. Add temporary diagnostic logging in production to verify the source of any continued issues

## Common Patterns for API Routes

Each API route should follow this pattern:

```typescript
export async function GET(request: NextRequest) {
  try {
    // During static site generation, return mock data
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.log('Returning mock data during build');
      return NextResponse.json({ 
        success: true, 
        isMockData: true,
        data: getMockData()
      });
    }
    
    // Normal database query process
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('table').select('*');
    
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      data: data 
    });
  } catch (error: any) {
    // Only use fallback for genuine database connection errors
    if (isDatabaseConnectionError(error)) {
      console.error('Database connection error, using fallback data:', error);
      return NextResponse.json({ 
        success: true, 
        isFallback: true,
        data: getFallbackData()
      });
    }
    
    return handleApiError(error, 'Error message');
  }
}
``` 