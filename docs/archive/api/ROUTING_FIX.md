# Routing Fix Documentation

## Issue

The MixerAI 2.0 application was experiencing 500 Internal Server errors during navigation due to duplicate routes in the Next.js application. The specific error was:

```
Error: You cannot have two parallel pages that resolve to the same path. Please check /(dashboard)/workflows/[id]/page and /workflows/[id]/page. Refer to the route group docs for more information: https://nextjs.org/docs/app/building-your-application/routing/route-groups
```

The application had duplicate routes:
- `/src/app/(dashboard)/workflows/[id]/page.tsx`
- `/src/app/workflows/[id]/page.tsx`

## Cause

1. The project originally used a route group `(dashboard)` to apply a common layout to dashboard pages.
2. Later, the project moved to a different pattern using a root layout wrapper component (`RootLayoutWrapper`) which provides the same layout regardless of route.
3. During this transition, both route patterns remained in the codebase, causing conflicts.
4. The middleware was disabled (`return NextResponse.next()` at the top of the function) but left in the codebase, which may have contributed to confusion.

## Solution

1. Removed the duplicate routes in the `(dashboard)` route group:
   - Deleted `/src/app/(dashboard)/workflows/[id]/page.tsx`
   - Deleted `/src/app/(dashboard)/workflows/[id]/edit/page.tsx`

2. Updated documentation to clarify the routing structure:
   - Added a note to `docs/DOCUMENTATION.md` explaining the routing changes
   - Created this document (`docs/ROUTING_FIX.md`) to detail the fix

3. Future recommendations:
   - Consider removing the middleware file if it's no longer needed
   - Consider removing the empty `(dashboard)` route group folders if they're no longer used
   - Ensure all navigation links point to the correct routes (e.g., `/workflows` not `/dashboard/workflows`)
   - Consider using only one routing pattern consistently across the application

## Current Routing Structure

The application now uses these routes for workflows:

- `/workflows` - Workflows listing page
- `/workflows/new` - Create new workflow page
- `/workflows/[id]` - View workflow details
- `/workflows/[id]/edit` - Edit workflow

Navigation is handled by the `RootLayoutWrapper` component, which provides consistent navigation across all routes except those specifically excluded (auth and API routes).

## User Management Functionality

The user management features are now available at these routes:

- `/users` - User listing page
- `/users/invite` - User invitation page

The user invitation functionality includes:

1. Email invitation to new users
2. Role assignment (Admin, Editor, Viewer)
3. Optional brand assignment
4. Validation and error handling

API endpoints for user management:

- `POST /api/users/invite` - Sends an invitation to a new user and optionally assigns them to a brand
- `GET /api/users` - Retrieves all users with their profiles and permissions

All user management pages follow the same layout pattern as the rest of the application, maintaining consistency throughout the UI. 