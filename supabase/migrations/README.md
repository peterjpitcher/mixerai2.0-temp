# Database Migrations

## Current Migration Status (2025-06-18)

All migrations have been consolidated into a single final migration file:
- `20250618_final_squashed_schema.sql`

This represents the complete database schema including all updates through June 18, 2025.

### Recent Updates Applied
The final migration includes:
- Batch support for tool_run_history (batch_id, batch_sequence columns)
- Email preferences for user profiles (email_notifications_enabled, email_frequency, email_preferences)
- All previous schema elements from earlier migrations

## Migration History
All individual migration files have been removed after consolidation. The full schema includes:
- All tables, indexes, and constraints
- All ENUM types
- All functions and procedures
- All views
- All Row Level Security (RLS) policies
- All triggers
- Initial seed data

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