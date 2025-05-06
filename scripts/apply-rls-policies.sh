#!/bin/bash
# Apply Row-Level Security (RLS) policies to the database

# Set the script to exit immediately if any command fails
set -e

# Load environment variables if .env file exists
if [ -f .env ]; then
  echo "Loading environment variables from .env"
  export $(grep -v '^#' .env | xargs)
fi

# Check if we're using Supabase or direct PostgreSQL
if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "Using Supabase for database connection"
  
  # Extract database info from Supabase URL
  # Example: https://abcdefghijklm.supabase.co
  SUPABASE_HOST=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's|^[^/]*//||' | sed 's|\..*$||')
  
  # Use supabase CLI if available
  if command -v supabase &> /dev/null; then
    echo "Applying RLS policies using Supabase CLI..."
    supabase db execute -f ./migrations/rls_policies.sql
  else
    echo "Supabase CLI not found. Please install it or use PostgreSQL connection details."
    exit 1
  fi
else
  # Use direct PostgreSQL connection
  if [ -z "$POSTGRES_HOST" ] || [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_DB" ]; then
    echo "Error: Missing PostgreSQL connection details."
    echo "Please set POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, and POSTGRES_DB"
    exit 1
  fi
  
  echo "Using direct PostgreSQL connection"
  echo "Applying RLS policies to database: $POSTGRES_DB"
  
  # Set the password environment variable for psql
  export PGPASSWORD=$POSTGRES_PASSWORD
  
  # Run the SQL script
  psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -f ./migrations/rls_policies.sql
fi

echo "✅ RLS policies have been applied successfully!"
echo "You can now test the policies by connecting to the database."
echo "Example SQL command to test as a specific user:"
echo "  SET LOCAL ROLE authenticated;"
echo "  SET LOCAL \"request.jwt.claims\" TO '{\"sub\": \"YOUR_USER_ID\"}';"
echo "  SELECT * FROM brands;"

# Make the script executable
chmod +x scripts/apply-rls-policies.sh 