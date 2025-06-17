#!/bin/bash

# MixerAI 2.0 - Apply Claims Workflow Migrations
# This script runs the claims workflow migrations

set -e

# Database connection parameters
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-mixerai}
DB_USER=${POSTGRES_USER:-postgres}
DB_PASSWORD=${POSTGRES_PASSWORD:-postgres}

# Export password for PSQL
export PGPASSWORD="$DB_PASSWORD"

echo "Applying claims workflow migrations..."

# Run the create claims workflows migration
echo "Creating claims_workflows and claims_workflow_steps tables..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f migrations/20250117_create_claims_workflows.sql

# Run the update roles migration
echo "Updating role constraints..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f migrations/20250117_update_claims_workflow_roles.sql

echo "Claims workflow migrations completed successfully!"