# Vercel Deployment Fix

This document outlines the steps taken to fix the Vercel deployment issues with MixerAI 2.0.

## Problem

The application was stuck in maintenance mode showing only a static page with the message:

```
MixerAI 2.0
Maintenance Mode
API Services Available
The application is currently in maintenance mode, but API services are available.
```

The root cause was that the Vercel configuration was set to use the custom server.js file in maintenance mode instead of deploying the proper Next.js application.

## Solution

The following changes were made to fix the deployment:

1. **Updated vercel.json**:
   - Removed the `builds` section that pointed to server.js
   - Removed the `routes` section that directed all traffic to server.js
   - Added proper `headers` configuration
   - Added `buildCommand` to use Next.js build

2. **Updated package.json**:
   - Changed the `start` script from `NODE_ENV=production node server.js` to `next start`
   - Modified the `build` script to ensure .net/routes-manifest.json is created

3. **Fixed routes-manifest.json issue**:
   - Created a .net directory with a valid routes-manifest.json file
   - Added a step in the build script to copy the Next.js generated routes-manifest.json to the .net directory

## Deployment Instructions

1. Push the changes to GitHub:
   ```bash
   git add vercel.json package.json .net/routes-manifest.json
   git commit -m "Fix Vercel deployment to use Next.js instead of maintenance mode"
   git push origin main
   ```

2. In the Vercel dashboard:
   - Redeploy the application from the GitHub repository
   - Ensure no environment variables are set to enable maintenance mode
   - Verify that the build logs show the Next.js build process and not just the server.js deployment

## Reverting to Maintenance Mode

If you need to put the site back in maintenance mode:

1. Change the `start` script in package.json back to `NODE_ENV=production node server.js`
2. Update vercel.json to use the server.js configuration:
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
3. Commit and push the changes to GitHub 