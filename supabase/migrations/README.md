# Database Migrations

## Squashed Migration (2025-06-18)

All previous migrations have been squashed into a single comprehensive migration file:
- `20250618_squashed_complete_schema.sql`

This migration contains the complete database schema as of June 18, 2025, including:
- All tables, indexes, and constraints
- All ENUM types
- All functions and procedures
- All views
- All Row Level Security (RLS) policies
- All triggers
- Initial seed data for content types and countries

## Archived Migrations

Previous individual migration files have been archived to:
- `/migrations_archive_20250618/`

These are kept for historical reference but should not be used for new deployments.

## Important Notes

1. **Fresh Deployments**: Use only the squashed migration file
2. **Existing Deployments**: No action needed - the squashed migration represents the current state
3. **New Migrations**: Create new migration files following the naming convention: `YYYYMMDD_description.sql`

## Migration Naming Convention

```
YYYYMMDD_description.sql
```

Example: `20250619_add_new_feature.sql`

## Running Migrations

```bash
# Apply all migrations
./scripts/run-migrations.sh

# Reset database (CAUTION: destroys all data)
./scripts/reset-database.sh
```

## Creating New Migrations

When adding new database changes:
1. Create a new migration file with the current date
2. Include only the incremental changes
3. Test thoroughly before committing
4. Update relevant documentation

## Schema Documentation

For complete schema documentation, see:
- `/docs/database.md` - Database schema and relationships
- `/2025-06-18-schema.sql` - Full schema dump used for squashing