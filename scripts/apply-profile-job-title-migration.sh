#!/bin/bash

# Script to apply the job_title column migration to the profiles table
# This script requires the SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables

# Text formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BOLD}MixerAI 2.0 - Profile Table Migration${NC}"
echo "========================================"
echo ""

# Check for required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  # Try to load from .env file
  if [ -f ".env" ]; then
    echo -e "${YELLOW}Loading environment variables from .env file...${NC}"
    export $(grep -v '^#' .env | xargs)
  fi
  
  # Set variables from NEXT_PUBLIC versions if specific ones are not set
  if [ -z "$SUPABASE_URL" ] && [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    export SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
  fi
fi

# Recheck after potential loading
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo -e "${RED}Error: Missing required environment variables${NC}"
  echo "Please ensure the following variables are set:"
  echo "  - SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)"
  echo "  - SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

# Check if the migration file exists
MIGRATION_FILE="migrations/add_job_title_to_profiles_v2.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
  echo -e "${RED}Error: Migration file not found at $MIGRATION_FILE${NC}"
  exit 1
fi

echo -e "${YELLOW}Applying migration to add job_title column to profiles table...${NC}"

# Apply the migration using curl and the Supabase REST API
response=$(curl -s \
  -X POST "$SUPABASE_URL/rest/v1/rpc/pgexec" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"sql\": \"$(cat $MIGRATION_FILE | tr -d '\n' | sed 's/"/\\"/g')\"}")

# Check for errors in the response
if [[ $response == *"error"* ]]; then
  echo -e "${RED}Error applying migration:${NC}"
  echo $response | jq .
  exit 1
fi

echo -e "${GREEN}Migration applied successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Restart your application to pick up the schema changes"
echo "2. Test the user invitation flow again"
echo ""
echo -e "${BOLD}Remember:${NC} Users who were already invited will need their profiles updated manually."
echo "You can run this SQL to update existing profiles:"
echo ""
echo -e "${YELLOW}UPDATE profiles SET job_title = auth.users.raw_user_meta_data->>'job_title' FROM auth.users WHERE profiles.id = auth.users.id AND profiles.job_title IS NULL;${NC}"
echo ""

chmod +x scripts/apply-profile-job-title-migration.sh 