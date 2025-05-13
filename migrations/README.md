# MixerAI 2.0 Database Migrations and Schema

This directory primarily serves as a historical archive for past database migration scripts.

## Authoritative Schema

The single source of truth for the current database schema is the `supabase-schema.sql` file located in the project root.

To set up a new database or reset an existing one, you should apply the `supabase-schema.sql` file using a PostgreSQL client tool (e.g., `psql`). For example:

```bash
psql -h <your_host> -U <your_user> -d <your_database> -f ../supabase-schema.sql
```

(Replace placeholders with your actual database connection details.)

## Archive

This `migrations/` directory contains an `archive/` subdirectory:

- **[archive](./archive/)**: Contains previously used individual SQL migration scripts and older consolidated migration files. These have been superseded by the comprehensive `supabase-schema.sql` and are kept for historical reference only.

Each archive subdirectory may include its own README.md file with descriptions of its contents.
