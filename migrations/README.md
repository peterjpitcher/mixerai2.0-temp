# MixerAI 2.0 Database Migrations

This directory contains the database migrations for the MixerAI 2.0 application.

## Consolidated Migrations

For simplicity and ease of deployment, we now use a single consolidated migration file that contains all necessary SQL statements:

- [consolidated_migrations.sql](./consolidated_migrations.sql) - Complete database schema and base data

This approach makes it easier to set up new environments and ensures consistency across deployments.

## Running Migrations

To apply the migrations, use the script:

```bash
./scripts/run-migrations.sh
```

You can specify custom database connection parameters:

```bash
./scripts/run-migrations.sh --host localhost --port 5432 --database mixerai --user postgres --password your_password
```

For a clean database reset, use the `--clean` flag:

```bash
./scripts/run-migrations.sh --clean
```

## Archive

Previous migration files are archived in the [archive](./archive) directory for reference purposes. These files are no longer used in the application.

Each archive includes a README.md file with descriptions of the archived migrations and when they were consolidated.
