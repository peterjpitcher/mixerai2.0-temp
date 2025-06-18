#!/bin/bash

# Script to add and populate the email column to the profiles table
# This script resolves the "column profiles.email does not exist" error
# by adding the email column and setting up a trigger to keep it in sync with auth.users
#
# Usage: ./scripts/apply-email-migration.sh [--host HOST] [--port PORT] [--database DB] [--user USER] [--password PASSWORD]

# Default database connection parameters
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="mixerai"
DB_USER="postgres"
DB_PASSWORD=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      DB_HOST="$2"
      shift 2
      ;;
    --port)
      DB_PORT="$2"
      shift 2
      ;;
    --database)
      DB_NAME="$2"
      shift 2
      ;;
    --user)
      DB_USER="$2"
      shift 2
      ;;
    --password)
      DB_PASSWORD="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Set password environment variable if provided
if [[ -n "$DB_PASSWORD" ]]; then
  export PGPASSWORD="$DB_PASSWORD"
fi

echo "============================================================="
echo "Adding email column to profiles table in database: $DB_NAME"
echo "This will:"
echo "1. Add an 'email' column to the profiles table if it doesn't exist"
echo "2. Populate it with emails from auth.users for existing profiles"
echo "3. Create a trigger to keep it in sync when users update their email"
echo "============================================================="

# Run the migration
psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f supabase/migrations/20240125_add_email_to_profiles.sql

# Check if migration was successful
if [ $? -eq 0 ]; then
  echo "============================================================="
  echo "✅ Email column migration completed successfully!"
  echo "The 'column profiles.email does not exist' error should now be resolved."
else
  echo "============================================================="
  echo "❌ Migration failed. Please check the error messages above."
fi

# Reset password environment variable
if [[ -n "$PGPASSWORD" ]]; then
  unset PGPASSWORD
fi 