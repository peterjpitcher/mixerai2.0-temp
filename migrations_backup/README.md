# Database Migrations

This folder contains database migrations for the MixerAI 2.0 application.

## Current Structure

After consolidation on 2025-01-16, we have:

1. **20250116_initial_schema.sql** - Complete initial schema extracted from production database
2. **20250116_add_missing_tables.sql** - Additional tables and features not yet in production

## Running Migrations

To apply migrations to your database:

```bash
# Run all migrations in order
./scripts/run-migrations.sh

# Or run specific migration
psql $DATABASE_URL -f migrations/20250116_initial_schema.sql
psql $DATABASE_URL -f migrations/20250116_add_missing_tables.sql
```

## Migration History

All previous migrations have been squashed into the initial schema. Historical migrations are archived in `migrations/archive/` for reference.

## Creating New Migrations

When creating new migrations:

1. Name them with format: `YYYYMMDD_description.sql`
2. Include both UP and DOWN migrations when possible
3. Test on local database before applying to production
4. Document any breaking changes

## Notes

- The initial schema includes all Supabase-specific tables and functions
- RLS (Row Level Security) policies are included in the schema
- The schema is designed to work with Supabase Auth