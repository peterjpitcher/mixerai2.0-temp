# MixerAI 2.0 Deployment Fix Plan

## Current Issue

The deployment is failing with the following error:

```
Error: Page "/api/workflows/[id]" is missing "generateStaticParams()" so it cannot be used with "output: export" config.
```

This error occurs because we're attempting to use Next.js's static export (`output: 'export'`) with dynamic API routes, but we haven't provided the necessary `generateStaticParams()` function to pre-render these routes at build time.

## Root Cause Analysis

1. **Static Export Configuration**: We're using `output: 'export'` in `next.config.js`, which requires all dynamic routes to be pre-rendered at build time.

2. **Dynamic API Routes**: We have dynamic API routes like `/api/workflows/[id]` without the corresponding `generateStaticParams()` function.

3. **Incompatibility**: Next.js API routes are not fully compatible with static exports because they're designed to be server-side endpoints.

## Solution Options

We have three potential approaches:

### Option 1: Remove Static Export Configuration (Recommended)

Switch back to a standard Next.js serverless deployment by removing the `output: 'export'` configuration. This allows dynamic API routes to function properly.

**Pros:**
- Enables full API functionality
- Simplifies deployment
- Works with dynamic routes

**Cons:**
- May require additional Vercel configuration

### Option 2: Add generateStaticParams() to Dynamic Routes

For each dynamic route (like `/api/workflows/[id]`), add a `generateStaticParams()` function to pre-generate all possible route combinations at build time.

**Pros:**
- Maintains static export approach
- Could work for routes with a limited number of parameters

**Cons:**
- Not practical for truly dynamic routes where IDs come from a database
- Creates massive build outputs for routes with many possible values
- Requires substantial code changes

### Option 3: Hybrid Approach with Client-Side API Handling

Keep static export but move API functionality to client-side with alternatives:

**Pros:**
- Maintains static deployment benefits
- Simpler deployment process

**Cons:**
- Requires significant app architecture changes
- Less secure for sensitive operations

## Implementation Plan

We'll proceed with Option 1 as the most practical solution:

1. **Remove Static Export Configuration**
   - Modify `next.config.js` to remove `output: 'export'`
   - Update Vercel configuration to use the Next.js framework

2. **Update Vercel Configuration**
   - Modify `vercel.json` to use standard Next.js deployment settings
   - Remove static export specific settings (like rewrites to index.html)

3. **Remove Middleware Limitations if Present**
   - Ensure middleware.ts isn't blocking API routes

4. **Test Deployment**
   - Deploy changes to Vercel
   - Verify API routes function correctly

## Step-by-Step Implementation

### 1. Update next.config.js

Remove the `output: 'export'` configuration and related static export settings.

### 2. Update vercel.json

Simplify to use Next.js's built-in deployment capabilities.

### 3. Commit and Deploy

Push changes to git and trigger a new Vercel deployment.

## Fallback Plan

If Option 1 doesn't work, we'll implement Option 3 by:

1. Creating client-side API handlers
2. Implementing local state management 
3. Using localStorage or IndexedDB for persistence

This approach would require more extensive changes but would allow the app to deploy as a static site. 