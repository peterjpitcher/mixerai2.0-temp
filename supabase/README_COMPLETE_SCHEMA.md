# Complete Production Schema Migration

This directory contains the complete production schema migrations generated on 2025-01-04.

## Migration Files

1. **20250104100000_complete_production_schema.sql**
   - Creates all tables, foreign keys, and regular indexes
   - Must be run first
   - Wrapped in a transaction (BEGIN/COMMIT)

2. **20250104100001_complete_production_functions.sql**
   - Creates all functions, views, triggers, and RLS policies
   - Must be run second (depends on tables from first migration)
   - Wrapped in a transaction (BEGIN/COMMIT)

3. **20250104100002_concurrent_indexes.sql**
   - Creates concurrent indexes for performance
   - Can be run while database is in use
   - NOT wrapped in a transaction (concurrent indexes cannot be created in transactions)
   - Optional but recommended for production performance

## How to Apply

### For a Fresh Database

Run the migrations in order:

```bash
# 1. Create tables and basic indexes
psql -h your-host -U your-user -d your-database -f 20250104100000_complete_production_schema.sql

# 2. Create functions, views, triggers, and policies
psql -h your-host -U your-user -d your-database -f 20250104100001_complete_production_functions.sql

# 3. Create concurrent indexes (optional but recommended)
psql -h your-host -U your-user -d your-database -f 20250104100002_concurrent_indexes.sql
```

### Using Supabase CLI

```bash
# Apply migrations through Supabase
supabase db push

# The concurrent indexes may need to be run manually:
supabase db execute -f 20250104100002_concurrent_indexes.sql
```

## Key Changes Included

1. **Fixed Table References**
   - Changed references from `brand_master_claims` to `master_claim_brands` (correct table name)
   - Fixed foreign key constraint names

2. **Added Missing Columns**
   - Added batch support columns to `tool_run_history` (`batch_id`, `batch_sequence`)
   - Added email preference columns to `profiles`
   - Added `comment` and `updated_claim_text` to `claim_workflow_history`

3. **Updated Enums**
   - Removed deprecated claim types ('mandatory', 'conditional')
   - Added proper constraints for claim types

4. **Performance Optimizations**
   - Added comprehensive indexes for all foreign keys
   - Added composite indexes for common query patterns
   - Added GIN indexes for JSONB columns
   - Added text search indexes for claims and content

5. **Security Enhancements**
   - Comprehensive RLS policies for all tables
   - Proper permission checks using helper functions
   - Security logging capabilities

## Important Notes

- These migrations create a complete schema from scratch
- Do NOT run on an existing database without careful review
- The concurrent indexes file should be run separately and can be run while the database is in use
- Make sure all required extensions are enabled (uuid-ossp, pgcrypto, etc.)
- Review and adjust RLS policies based on your security requirements

## Rollback

To rollback, you would need to drop all created objects in reverse order. Always backup your database before applying migrations!