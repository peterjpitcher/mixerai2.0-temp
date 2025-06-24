#!/bin/bash

# Script to apply the brand_master_claim_brands junction table migration

set -e

echo "========================================"
echo "Applying junction table migration"
echo "========================================"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if required environment variables are set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ Error: SUPABASE_DB_URL is not set in .env file"
    echo "Please ensure your .env file contains the database connection string."
    exit 1
fi

# Apply the migration
echo "📋 Applying migration: 20250623150000_create_brand_master_claim_brands_junction.sql"
psql "$SUPABASE_DB_URL" -f supabase/migrations/20250623150000_create_brand_master_claim_brands_junction.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    echo ""
    echo "📊 Checking migrated data..."
    psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) as link_count FROM brand_master_claim_brands;"
    echo ""
    echo "🔍 Sample of migrated links:"
    psql "$SUPABASE_DB_URL" -c "SELECT b.name as brand_name, mcb.name as master_claim_brand_name 
                                 FROM brand_master_claim_brands bmcb 
                                 JOIN brands b ON b.id = bmcb.brand_id 
                                 JOIN master_claim_brands mcb ON mcb.id = bmcb.master_claim_brand_id 
                                 LIMIT 5;"
else
    echo "❌ Migration failed!"
    exit 1
fi

echo ""
echo "✅ Junction table migration completed successfully!"
echo ""
echo "Note: The old mixerai_brand_id column in master_claim_brands table has been"
echo "kept for backward compatibility. It can be removed in a future migration"
echo "after all code has been updated."