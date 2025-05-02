# MixerAI 2.0 Database Connection Setup

## Supabase Connection Configuration

The application has been updated to use Supabase for all database interactions, ensuring consistency and security. To properly connect to your Supabase instance, create or update your `.env` file with the following variables:

```
# Supabase connection
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Set to false to use Supabase for database access
USE_DIRECT_POSTGRES=false
```

## API Routes Updated

The following API routes have been updated to use the Supabase client instead of direct PostgreSQL connections:

1. `/api/brands` - Used for fetching all brands
2. `/api/content` - Used for fetching content with related details
3. `/api/content-types` - Used for fetching content types

## Connection Method

All API routes now use the `createSupabaseAdminClient()` function from `/src/lib/supabase/client.ts`. This ensures that:

1. All database operations go through Supabase
2. Proper authentication is maintained
3. Row-level security policies are enforced

## Local Development

For local development, you can still use the direct PostgreSQL connection by running:

```bash
./scripts/use-local-db.sh
```

However, for production deployments, ensure that all Supabase environment variables are properly set.

## Verification

To verify that your application is correctly connected to Supabase:

1. Ensure the `.env` file has the correct Supabase credentials
2. Check the browser console for any database connection errors
3. Verify data is loading correctly in all dashboard pages

If you encounter any issues, ensure that:
- Your Supabase project is active
- Your API keys are correct
- Your Supabase database has the expected schema 