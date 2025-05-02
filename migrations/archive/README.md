# Archived Migration Files

This directory contains the original migration files that have been consolidated into a single squashed migration file (`migrations/squashed_migrations.sql`).

These files are kept for reference purposes but are no longer used in the application.

## File Descriptions

- `001_initial_schema.sql` - The initial schema creation with tables and relationships
- `001_clean_schema.sql` - A clean schema with no sample data
- `002_test_data.sql` - Test data for development and testing

## Migration Strategy

For simplicity and ease of deployment, we now use a single consolidated migration file that contains all necessary SQL statements. This approach makes it easier to set up new environments and ensures consistency across deployments.

To run the current migrations, use the script at `scripts/run-migrations.sh`. 