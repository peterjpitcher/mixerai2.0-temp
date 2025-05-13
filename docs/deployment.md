# Deployment and Operations Guide for MixerAI 2.0

This document covers running the application, build processes, deployment optimizations, and domain configuration.

## Running the Application

### 1. Development Mode

To run the application in development mode with hot reloading:

```bash
npm run dev
```

This typically starts the server on `http://localhost:3000` (or `http://localhost:3001` if specified in `package.json` scripts).

-   **Local Database**: If you intend to use a local PostgreSQL instance instead of Supabase for development, you might need to run a script like `./scripts/use-local-db.sh` first, which should configure the necessary environment variables (`USE_DIRECT_POSTGRES=true`, `POSTGRES_HOST`, etc.). Refer to `docs/database.md` for more on database connections.

### 2. Production Build and Start

To build the application for production and start the server:

```bash
npm run build
npm start
```

-   `npm run build` compiles the Next.js application into an optimized production build (usually in the `.next` folder).
-   `npm start` starts the Node.js server to serve the built application.

### 3. Database Migrations

Database schema changes are managed via migrations. Depending on the setup (Supabase CLI or custom scripts):

-   If using Supabase CLI, migrations are typically in `supabase/migrations` and applied with `supabase db push` or `supabase migration up`.
-   Custom migration scripts might exist (e.g., `./scripts/apply-website-urls-migration.sh` was mentioned for a specific schema change). Refer to `docs/database.md` for more details on the migration strategy.

## Build and Deployment Optimizations

Several optimizations have been implemented to ensure smooth building and deployment:

### 1. Dynamic API Routes

-   API routes that use authentication (and thus `cookies`) cannot be statically rendered at build time.
-   The `export const dynamic = "force-dynamic";` flag is added to these routes to ensure they are rendered dynamically at request time.
    ```typescript
    // Example in an API route file (e.g., src/app/api/some-route/route.ts)
    export const dynamic = "force-dynamic";
    ```
-   A utility script might be available (e.g., `./scripts/update-api-routes.sh` or `scripts/fix-dynamic-routes.sh` was mentioned) to automatically add this flag to relevant API routes, helping to fix build warnings related to cookie usage in static routes.

### 2. Configuration Cleanup

-   Ensuring `next.config.js` is up-to-date (e.g., removing deprecated flags like `experimental.serverActions` if Next.js version supports them by default).
-   Verifying all dependencies are correctly installed and component imports are accurate to prevent TypeScript errors during build.

## Domain Configuration

The MixerAI 2.0 application can be configured to run on a specific production domain (e.g., `mixerai.orangejely.co.uk` was mentioned as an example in past documentation).

### Key Configuration Areas for Production Domain:

1.  **Supabase Authentication Settings**:
    -   **Site URL**: In your Supabase project settings (Authentication -> URL Configuration), ensure the Site URL is set to your production domain (e.g., `https://mixerai.orangejely.co.uk`).
    -   **Additional Redirect URLs**: Add your production domain and any necessary callback paths (e.g., `https://mixerai.orangejely.co.uk/auth/callback`) to the list of allowed redirect URLs.

2.  **Email Templates**:
    -   User invitation emails, password reset emails, and other auth-related emails sent by Supabase should use links that point to your production domain. Templates can be customized in the Supabase dashboard (Authentication -> Email Templates).

3.  **Environment Variables**:
    -   Ensure all environment variables are correctly set in your hosting platform (e.g., Vercel, Netlify) for the production environment.
    -   This includes `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and any other domain-specific variables (e.g., `NEXT_PUBLIC_APP_URL=https://mixerai.orangejely.co.uk`).
    -   Using an environment variable like `NEXT_PUBLIC_APP_URL` throughout the application for constructing absolute URLs is a good practice to avoid hardcoding domains.

4.  **DNS and SSL Configuration**:
    -   Properly configure DNS records (e.g., A, CNAME) to point your custom domain to your hosting provider.
    -   Ensure SSL/TLS is enabled for your production domain to serve the site over HTTPS.

### Domain Configuration Testing & Verification

-   **Development Mode Warnings**: A warning component or console log might be implemented to display in development mode if critical domain-related environment variables (like `NEXT_PUBLIC_APP_URL`) are not set or misconfigured.
-   **Client-Side Verification**: Components (e.g., in the dashboard layout) might perform checks or use the configured app URL for certain features.
-   **API Verification**: Some API endpoints, particularly those involved in generating absolute URLs (like in email sending), should use the configured production domain.

By using environment variables for domain-specific settings, the application can avoid hardcoded values and be configured flexibly for different environments. 