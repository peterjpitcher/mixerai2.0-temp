#!/bin/bash

# Script to run the job_title migration
# Requires PostgreSQL client tools (psql) to be installed

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection parameters
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-postgres}
DB_USER=${POSTGRES_USER:-postgres}
DB_PASSWORD=${POSTGRES_PASSWORD}

# Check if we're using Supabase or direct PostgreSQL
if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Using Supabase connection..."
  # Instructions for Supabase
  echo "For Supabase, please run this SQL in the Supabase dashboard SQL editor:"
  echo "------------------------"
  cat migrations/add_job_title_if_missing.sql
  echo "------------------------"
  echo "Alternatively, use the Supabase CLI to run migrations."
  exit 0
fi

# Verify database connection parameters
if [ -z "$DB_PASSWORD" ]; then
  echo "ERROR: Database password not set. Please set POSTGRES_PASSWORD environment variable."
  exit 1
fi

echo "Running job_title migration script..."

# Run the SQL file
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/add_job_title_if_missing.sql

# Check if the migration was successful
if [ $? -eq 0 ]; then
  echo "Migration completed successfully!"
  echo "The job_title column has been added to the profiles table if it was missing."
else
  echo "Migration failed! Please check the error messages above."
  exit 1
fi

echo "Verifying migration..."
# Check if the job_title column exists now
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'job_title'
    ) THEN 'job_title column exists in profiles table ✅'
    ELSE 'job_title column is MISSING from profiles table ❌'
  END AS migration_status;
"

echo "Done!" 