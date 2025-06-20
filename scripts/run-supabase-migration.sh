#!/bin/bash

# Script to run a specific migration against Supabase
# Usage: ./scripts/run-supabase-migration.sh <migration_file>

if [ $# -eq 0 ]; then
    echo "Usage: $0 <migration_file>"
    echo "Example: $0 supabase/migrations/20250120_add_completed_workflow_steps_to_claims.sql"
    exit 1
fi

MIGRATION_FILE=$1

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "🚀 Running migration: $MIGRATION_FILE"
echo "📊 Against Supabase database..."

# Run the migration using Supabase CLI
supabase db push --file "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed!"
    exit 1
fi