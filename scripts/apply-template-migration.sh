#!/bin/bash

# Script to apply the content template system migration
# This will create the necessary database tables and add initial template data

echo "Applying content template system migration..."

# Load environment variables if .env file exists
if [ -f ".env" ]; then
  source .env
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set."
  echo "Please set it in your .env file or export it before running this script."
  exit 1
fi

# Apply the migration
cat migrations/content-template-system.sql | psql $DATABASE_URL

# Check if the migration was successful
if [ $? -eq 0 ]; then
  echo "Migration applied successfully!"
  echo "Content template system is now ready to use."
  echo "You can access it at /dashboard/templates"
else
  echo "Error: Migration failed to apply."
  echo "Please check the error messages above and ensure your database connection is working."
  exit 1
fi 