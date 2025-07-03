# Migration Instructions for Country Code Fix

## Issue
The `create_claim_with_associations` function in the database is not saving the country code to the `claims` table's `country_code` column.

## Migration File Created
`/supabase/migrations/20250703160000_fix_country_code_in_create_claim_function.sql`

## Manual Application Steps

Since there are issues with the Supabase migration system, you can apply this migration manually:

### Option 1: Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `/supabase/migrations/20250703160000_fix_country_code_in_create_claim_function.sql`
4. Paste and run the SQL

### Option 2: Fix Migration History First
1. Run the suggested repair commands:
   ```bash
   supabase migration repair --status reverted 20250616194957
   supabase migration repair --status reverted 20250616202303
   supabase migration repair --status reverted 20250616202721
   ```

2. Then try pushing again:
   ```bash
   supabase db push
   ```

### Option 3: Apply via Supabase CLI
1. Move files from "Already Applied" folder to a backup location
2. Clean up the migrations folder to only have valid migrations
3. Run `supabase db push`

## What the Migration Does

The migration updates the `create_claim_with_associations` function to:
1. Save the first country code from the `p_country_codes` array to the legacy `country_code` column
2. This ensures backward compatibility with existing code that expects the country_code to be populated

## Verification

After applying the migration, test by:
1. Creating a new claim via `/dashboard/claims/new`
2. Check the database to verify the `country_code` column is populated
3. The claim should appear correctly in the claims list with its country code

## SQL Content to Apply

```sql
-- Fix the create_claim_with_associations function to properly save country_code
CREATE OR REPLACE FUNCTION "public"."create_claim_with_associations"(
  -- [function parameters remain the same]
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
-- [function body with the fix for v_legacy_country_code]
$$;
```

The key change is adding:
```sql
-- Use the first country code for the legacy country_code column
IF array_length(p_country_codes, 1) > 0 THEN
  v_legacy_country_code := p_country_codes[1];
END IF;
```

And including `country_code` in the INSERT statement with value `v_legacy_country_code`.