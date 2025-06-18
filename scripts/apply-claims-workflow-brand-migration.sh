#!/bin/bash

# MixerAI 2.0 - Apply Claims Workflow Brand Migration
# This script removes the brand requirement from claims workflows

set -e

# Database connection parameters
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-mixerai}
DB_USER=${POSTGRES_USER:-postgres}
DB_PASSWORD=${POSTGRES_PASSWORD:-postgres}

# Export password for PSQL
export PGPASSWORD="$DB_PASSWORD"

echo "Applying claims workflow brand migration..."

# Run the migration to remove brand requirement
echo "Making brand_id optional for claims workflows..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f supabase/migrations/20250117_remove_brand_from_claims_workflows.sql

echo "Claims workflow brand migration completed successfully!"
echo "Claims workflows are now global and do not require brand association."