# Vercel Deployment Fix

## Issues

The deployment of MixerAI 2.0 to Vercel was experiencing two separate but related issues:

1. **Missing routes-manifest.json**:
   ```
   The file '/vercel/path0/.net/routes-manifest.json' couldn't be found.
   ```

2. **Missing styled-jsx dependency**:
   ```
   Cannot find module 'styled-jsx/style'
   Require stack:
   - /var/task/node_modules/next/dist/server/require-hook.js
   - /var/task/node_modules/next/dist/server/next.js
   - /var/task/server.js
   ```

These errors were causing 500 errors for both API endpoints and page rendering.

## Solution

We implemented a two-part solution:

### 1. Simplify the Server Implementation

Instead of using Next.js in a custom server, we created a lightweight standalone HTTP server:

- Removed the dependency on Next.js in the server.js file
- Created direct handlers for API routes that return fallback data
- Added a simple maintenance mode HTML page for non-API routes
- This avoids the complications of trying to integrate Next.js with a custom server

### 2. Add Missing Dependencies

- Added `styled-jsx` package to dependencies in package.json:
  ```json
  "styled-jsx": "^5.1.2"
  ```

### 3. Configure Vercel Properly

- Updated vercel.json to use the server.js directly:
  ```json
  {
    "version": 2,
    "builds": [
      {
        "src": "server.js",
        "use": "@vercel/node"
      }
    ],
    "routes": [
      {
        "src": "/(.*)",
        "dest": "/server.js"
      }
    ]
  }
  ```

## Current State

The application is now deployed in a "maintenance mode" where:

1. The API routes (/api/brands, /api/content, /api/content-types) work and return fallback data
2. A maintenance page is shown for all other routes

## Next Steps

1. **Database Connection**: Once we have reliable API endpoints, investigate and fix the database connection issues:
   - Check environment variables in the Vercel dashboard
   - Verify Supabase access permissions
   - Test database connectivity from Vercel's infrastructure

2. **Full Application Restoration**: After database connectivity is fixed:
   - Revert to the standard Next.js deployment approach
   - Remove the custom server.js 
   - Test all pages and routes 

3. **Monitoring and Logging**: Implement better error monitoring and logging to catch similar issues in the future 