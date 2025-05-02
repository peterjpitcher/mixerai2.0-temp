# MixerAI 2.0 Database Setup Guide

This guide explains how to set up the database for MixerAI 2.0 and configure the necessary environment variables.

## Prerequisites

- PostgreSQL (v12 or higher)
- Node.js (v18 or higher)
- npm or yarn

## Setting Up the Database

### Option 1: Using Docker (Recommended)

The easiest way to get started is by using Docker and Docker Compose:

1. Make sure Docker and Docker Compose are installed on your system
2. Run the following command from the project root:

```bash
docker-compose up -d
```

This will start a PostgreSQL instance on port 5432 with the default credentials.

### Option 2: Using an Existing PostgreSQL Installation

If you already have PostgreSQL installed, you can create a new database for MixerAI:

```bash
createdb mixerai
```

## Environment Variables

Create a `.env` file in the project root with the following variables:

```
# Database Connection
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=mixerai
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Supabase Connection (for auth and production)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name
AZURE_OPENAI_API_VERSION=2023-05-15

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

Replace the placeholder values with your actual credentials.

## Running Migrations

We use a single consolidated migration file (`migrations/squashed_migrations.sql`) that contains all necessary database setup. This approach simplifies deployment and ensures consistency across environments.

We provide a convenient script to run the migrations:

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

This will drop the existing database, create a new one, and apply all migrations.

## Development Mode

For local development, you can run the application with direct database access:

```bash
./scripts/use-local-db.sh
```

This script will set the necessary environment variables and start the development server.

## Schema Overview

The database schema includes the following tables:

- `brands` - Stores brand information and content guidelines
- `profiles` - User profiles linked to Supabase authentication
- `user_brand_permissions` - Maps users to brands with role-based access
- `content_types` - Defines different types of content (Article, PDP, etc.)
- `workflows` - Content approval workflows with steps as JSONB
- `content` - The actual content with metadata and status
- `notifications` - User notifications for workflow events
- `analytics` - Content performance metrics

## Database Connection in Production

In production, the application uses Supabase for both authentication and data storage. The direct PostgreSQL connection is primarily for local development and testing. 