# MixerAI 2.0 Route Structure

## Route Organization

MixerAI 2.0 uses a simplified route structure where all authenticated content is accessible through the `/dashboard` route prefix.

### Key Route Groups

1. **Dashboard Routes** - All authenticated content
   - `/dashboard/brands` - Brand management
   - `/dashboard/workflows` - Workflow management
   - `/dashboard/content` - Content management
   - `/dashboard/users` - User management

2. **Authentication Routes** - User authentication
   - `/auth/login` - User login
   // - `/auth/register` - New user registration (Removed - Invite-only system)

3. **API Routes** - Application APIs
   - `/api/brands` - Brand data endpoints
   - `/api/workflows` - Workflow endpoints
   - `/api/content` - Content management endpoints
   - `/api/users` - User management endpoints

4. **Public Routes** - Publicly accessible pages
   - `/` - Home page
   - `/terms` - Terms of service
   - `/privacy-policy` - Privacy policy

## Note on Removed Routes

The previously duplicated routes (`/brands`, `/workflows`, `/content`, `/users`) have been removed from the codebase. These routes now use permanent redirects to their `/dashboard` equivalents.

If you're looking for these directories and don't find them, that's intentional - they were removed as part of the Route Cleanup project (June 2024).

All routing is now handled through:

1. Framework-level redirects in `next.config.js`
2. Middleware-based redirects in `src/middleware.ts`

For more details on the route structure, see:
- `docs/ROUTE_CLEANUP_COMPLETION.md` 