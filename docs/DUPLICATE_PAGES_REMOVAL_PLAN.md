# MixerAI 2.0 - Duplicate Pages Removal Plan

## Executive Summary

The MixerAI 2.0 application currently maintains duplicate pages in two parallel route structures: top-level routes (`/brands`, `/workflows`, etc.) and dashboard routes (`/dashboard/brands`, `/dashboard/workflows`, etc.). This document outlines a comprehensive plan to eliminate this duplication, improve code maintainability, and simplify the application architecture.

## Current Situation Analysis

### Duplicate Route Structure

The application currently has the following duplicated route structures:

1. **Top-level routes:**
   - `/brands`, `/brands/new`, `/brands/[id]`, `/brands/[id]/edit`
   - `/workflows`, `/workflows/new`, `/workflows/[id]`, `/workflows/[id]/edit`
   - `/content`, `/content/article`, `/content/ownedpdp`, `/content/retailerpdp`
   - `/users`, `/users/invite`

2. **Dashboard routes:**
   - `/dashboard/brands`, `/dashboard/brands/new`, `/dashboard/brands/[id]`, `/dashboard/brands/[id]/edit`
   - `/dashboard/workflows`, `/dashboard/workflows/new`, `/dashboard/workflows/[id]`, `/dashboard/workflows/[id]/edit`
   - `/dashboard/content`, `/dashboard/content/article`, `/dashboard/content/ownedpdp`, `/dashboard/content/retailerpdp`
   - `/dashboard/users`, `/dashboard/users/invite`

### Current Redirection Approach

The application currently uses a partial redirection approach in `next.config.js`:

```javascript
async redirects() {
  return [
    // Redirect root content page to article content
    {
      source: '/content',
      destination: '/dashboard/content/article',
      permanent: false,
    },
    // Redirect dashboard content root to article content
    {
      source: '/dashboard/content',
      destination: '/dashboard/content/article',
      permanent: false,
    },
    // Legacy routes support
    {
      source: '/brands',
      destination: '/dashboard/brands',
      permanent: false,
    },
    {
      source: '/users',
      destination: '/dashboard/users',
      permanent: false,
    },
    {
      source: '/workflows',
      destination: '/dashboard/workflows',
      permanent: false,
    }
  ];
}
```

However, this solution only redirects the root paths and not their nested routes, causing confusion and maintenance overhead.

### Navigation Implementation

The current navigation system (`UnifiedNavigation`) already uses dashboard routes exclusively:

```tsx
// Primary nav items
const navItems: (NavItem | NavGroupItem)[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <Home className="h-5 w-5" />,
    segment: ''
  },
  {
    href: '/dashboard/workflows',
    label: 'Workflows',
    icon: <GitBranch className="h-5 w-5" />,
    segment: 'workflows'
  },
  {
    href: '/dashboard/brands',
    label: 'Brands',
    icon: <Building2 className="h-5 w-5" />,
    segment: 'brands'
  },
  // Content with submenu
  {
    label: 'Content',
    icon: <BookOpen className="h-5 w-5" />,
    segment: 'content',
    defaultOpen: true,
    items: [
      {
        href: '/dashboard/content/article',
        label: 'Articles',
        icon: <FileText className="h-4 w-4" />,
        segment: 'article'
      },
      {
        href: '/dashboard/content/ownedpdp',
        label: 'Owned PDP',
        icon: <ShoppingBag className="h-4 w-4" />,
        segment: 'ownedpdp'
      },
      {
        href: '/dashboard/content/retailerpdp',
        label: 'Retailer PDP',
        icon: <Store className="h-4 w-4" />,
        segment: 'retailerpdp'
      }
    ]
  },
  {
    href: '/dashboard/users',
    label: 'Users',
    icon: <Users className="h-5 w-5" />,
    segment: 'users'
  }
];
```

## Issues with the Current Approach

1. **Code Duplication**: Maintaining two sets of nearly identical pages increases development time and risk of inconsistencies.

2. **Increased Bundle Size**: Duplicate pages increase the JavaScript bundle size unnecessarily.

3. **Maintenance Overhead**: Changes must be implemented in multiple places, increasing the chance of errors.

4. **Inconsistent User Experience**: Users may encounter different designs or behaviors depending on which URL they use.

5. **Authentication Confusion**: Some pages may have different authentication behaviors.

## Proposed Solution

We propose to completely remove all non-dashboard pages and routes, keeping only the dashboard-prefixed routes, and implement comprehensive redirects at the framework level.

### High-Level Plan

1. Implement optimized redirects for all non-dashboard routes
2. Create a middleware solution for fine-grained control and dynamic handling
3. Implement a phased approach to safely remove duplicate pages
4. Enhance testing coverage to verify redirect behavior
5. Update documentation to reflect the new simplified structure

## Detailed Implementation Plan

### 1. Optimized Redirect Configuration

Update `next.config.js` with catch-all patterns for more efficient and future-proof redirects:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... other config options
  
  // Add optimized redirects using catch-all patterns
  async redirects() {
    return [
      // Brand redirects with catch-all pattern
      { 
        source: '/brands/:path*', 
        destination: '/dashboard/brands/:path*', 
        permanent: false 
      },
      
      // Workflow redirects with catch-all pattern
      { 
        source: '/workflows/:path*', 
        destination: '/dashboard/workflows/:path*', 
        permanent: false 
      },
      
      // Content redirects with catch-all pattern
      { 
        source: '/content/:path*', 
        destination: '/dashboard/content/:path*', 
        permanent: false 
      },
      
      // User redirects with catch-all pattern
      { 
        source: '/users/:path*', 
        destination: '/dashboard/users/:path*', 
        permanent: false 
      },
      
      // Special redirect for content index
      { 
        source: '/dashboard/content', 
        destination: '/dashboard/content/article', 
        permanent: false 
      },
    ];
  },
};

module.exports = nextConfig;
```

These optimized redirects provide several benefits:
- Less boilerplate with one rule per feature domain instead of many individual rules
- Automatic coverage of any future nested pages (e.g., `/brands/archive/2025`)
- Cleaner, more maintainable configuration

### 2. Next.js Middleware for Fine-Grained Control

For more control over redirects, especially for conditional logic, we'll implement a middleware solution:

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Catch all non-dashboard routes and redirect to dashboard equivalents
  if (['/brands', '/workflows', '/content', '/users']
      .some(prefix => pathname.startsWith(prefix))) {
    
    // Create the new path by replacing the prefix
    const newPath = pathname.replace(
      /^\/(brands|workflows|content|users)/, 
      '/dashboard/$1'
    )
    
    // Preserve query parameters
    const url = new URL(newPath, req.url)
    req.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value)
    })
    
    return NextResponse.redirect(url)
  }
  
  return NextResponse.next()
}

// Configure middleware to run only on specific paths
export const config = {
  matcher: [
    '/brands/:path*',
    '/workflows/:path*',
    '/content/:path*',
    '/users/:path*',
  ],
}
```

The middleware approach offers:
- Ability to add conditional logic (e.g., based on authentication state)
- Centralized handling of all redirects
- Preservation of query parameters and URL structure
- Execution before page rendering for better performance

### 3. Phased Implementation Approach

To minimize risk, we'll use a two-phase approach:

#### Phase 1: Create Empty Redirect Folders

1. Keep the non-dashboard folders (`/src/app/brands`, etc.), but replace their content with simple redirect components:

```tsx
// src/app/brands/page.tsx (and similar files)
export default function LegacyBrandsPage() {
  // This page is kept temporarily to catch any missed redirects
  // The middleware or next.config.js redirects should handle this before rendering
  return null;
}
```

2. Deploy this version and:
   - Monitor logs for any unexpected 404 errors
   - Check analytics for pages not being properly redirected
   - Verify that all query parameters are preserved

#### Phase 2: Complete Removal

After confirming Phase 1 is successful and all redirects are working correctly:

1. Remove the legacy folders entirely:
   - `/src/app/brands`
   - `/src/app/workflows`
   - `/src/app/content`
   - `/src/app/users`

2. Rely solely on the middleware and `next.config.js` redirects

This phased approach provides a safety net in case of unexpected issues with external links or bookmarks.

### 4. Route Groups for Organization (Optional)

For better code organization without affecting URLs, we can use Next.js route groups:

```
src/
 ┣ app/
 ┃ ┣ (dashboard)/
 ┃ ┃ ┗ brands/
 ┃ ┃   ┣ page.tsx      ← source-of-truth implementation
 ┃ ┃   ┗ [id]/
 ┃ ┃     ┗ page.tsx
 ┃ ┣ dashboard/       ← just re-exports components from (dashboard)
 ┃ ┃ ┗ brands/
 ┃ ┃   ┣ page.tsx
 ┃ ┃   ┗ [id]/
 ┃ ┃     ┗ page.tsx
 ┃ ┣ brands/          ← empty redirector (Phase 1 only)
 ┃ ┃ ┗ page.tsx
 ┃ ┗ ...
```

This approach:
- Keeps related code together in the file system
- Maintains a single source of truth
- Doesn't affect URL structure

### 5. Enhanced Testing Strategy

We'll implement a comprehensive testing approach to ensure all redirects work correctly:

#### End-to-End Tests

Using Playwright or Cypress:

```typescript
// tests/redirects.spec.ts
test('should redirect from top-level routes to dashboard routes', async ({ page }) => {
  // Test brand routes
  await page.goto('/brands/42/edit?foo=bar');
  await page.waitForURL('/dashboard/brands/42/edit?foo=bar');
  
  // Test workflow routes
  await page.goto('/workflows/new?template=social');
  await page.waitForURL('/dashboard/workflows/new?template=social');
  
  // Test content routes
  await page.goto('/content/article');
  await page.waitForURL('/dashboard/content/article');
  
  // Test user routes
  await page.goto('/users/invite?role=editor');
  await page.waitForURL('/dashboard/users/invite?role=editor');
});
```

#### Route Coverage Script

Create a script to verify all paths are either served or redirected:

```typescript
// scripts/verify-routes.ts
import fs from 'fs';
import path from 'path';

const APP_DIR = path.join(process.cwd(), 'src/app');

// Find all page.tsx files
function findAllPages(dir: string, pages: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findAllPages(filePath, pages);
    } else if (file === 'page.tsx') {
      pages.push(filePath);
    }
  }
  
  return pages;
}

// Extract route from file path
function filePathToRoute(filePath: string): string {
  return filePath
    .replace(APP_DIR, '')
    .replace(/\/page\.tsx$/, '')
    .replace(/\/\[([^\]]+)\]/g, '/:$1');
}

// Main function
function verifyRoutes() {
  const pages = findAllPages(APP_DIR);
  const routes = pages.map(filePathToRoute);
  
  console.log('All application routes:');
  routes.forEach(route => console.log(route));
  
  // Verify dashboard routes exist for non-dashboard routes
  const nonDashboardRoutes = routes.filter(r => 
    r.startsWith('/brands') || 
    r.startsWith('/workflows') || 
    r.startsWith('/content') || 
    r.startsWith('/users')
  );
  
  for (const route of nonDashboardRoutes) {
    const dashboardRoute = route.replace(
      /^\/(brands|workflows|content|users)/, 
      '/dashboard/$1'
    );
    
    if (!routes.includes(dashboardRoute)) {
      console.warn(`Warning: Dashboard route ${dashboardRoute} doesn't exist for ${route}`);
    }
  }
}

verifyRoutes();
```

### 6. Authentication Boundary Considerations

Our current authentication boundary is clear with `requireAuth()` middleware on `/dashboard/*` routes. We need to:

1. Verify no public content is accidentally protected: 
   - Check for any legacy public routes that should remain public (e.g., marketing pages)
   - Ensure these are handled appropriately in middleware

2. Ensure consistent query parameter handling:
   - Verify both redirect rules and middleware preserve all query strings
   - Test authentication redirects that include 'return to' URLs

3. Check for any hardcoded URLs in authentication flows:
   - Update any authentication code that might redirect to old URL patterns

## Rollback Plan

If issues are encountered after implementation:

1. For Phase 1: Restore the original page components in the non-dashboard directories.
2. For Phase 2: Recreate the placeholder redirect components in non-dashboard directories.
3. Disable the middleware temporarily if it's causing issues.
4. Roll back `next.config.js` changes to the previous redirects configuration.

## Benefits of the New Approach

1. **Simplified Codebase**: Elimination of duplicated code improves maintainability.
2. **Reduced Bundle Size**: Fewer pages mean smaller JavaScript bundles and faster load times.
3. **Consistent UX**: Users will always experience the same UI regardless of how they access pages.
4. **Simplified Routing Logic**: One canonical URL for each feature improves SEO and link sharing.
5. **Clearer Authentication Boundaries**: All protected content lives under `/dashboard`.
6. **Future-Proof Redirects**: Catch-all patterns will handle any new routes automatically.
7. **Better Performance**: Framework-level redirects are more efficient than client-side redirects.

## Timeline and Resource Requirements

| Phase | Estimated Effort | Description |
|-------|-----------------|-------------|
| Planning & Discovery | 1 day | Complete analysis and create detailed plan (this document) |
| Implementation Phase 1 | 1.5 days | Implement redirects, middleware, and placeholder pages |
| Monitoring & Validation | 0.5 days | Monitor logs and analytics for issues |
| Implementation Phase 2 | 1 day | Complete removal of duplicate code |
| Testing | 1.5 days | Implement and run comprehensive tests |
| Documentation | 0.5 days | Update project documentation |
| **Total** | **6 days** | |

## Conclusion

The proposed duplicate pages removal plan will significantly improve the MixerAI 2.0 codebase by eliminating redundancy, enhancing maintainability, and providing a more consistent user experience. By using catch-all redirects, middleware for fine-grained control, and a phased implementation approach, we can safely transition to a cleaner architecture while maintaining backward compatibility.

Upon approval, we recommend implementing this plan in a dedicated branch that can be thoroughly tested before merging to the main development branch. 