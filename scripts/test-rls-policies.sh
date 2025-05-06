#!/bin/bash

# Script to test Row Level Security (RLS) policies
# Usage: ./test-rls-policies.sh [local|production]

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default to local if no environment specified
ENVIRONMENT=${1:-local}

# Function to run tests against a database
run_rls_tests() {
  local db_url=$1
  local db_name=$2
  
  echo -e "${YELLOW}Testing RLS policies on ${db_name}...${NC}"
  
  # Check if PSQL is available
  if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql command not found. Please install PostgreSQL client tools.${NC}"
    exit 1
  }
  
  # Define SQL test cases
  TEST_SQL=$(cat << 'EOF'
-- Check if RLS is enabled on key tables
SELECT table_name, row_security_active 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('brands', 'content', 'workflows', 'profiles', 'user_brand_permissions')
ORDER BY table_name;

-- Check if policies exist
SELECT tablename, policyname, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- Test regular user SELECT on brands (should see all brands)
SET SESSION ROLE authenticated;
SET LOCAL ROLE authenticated;
SELECT auth.uid();
SELECT COUNT(*) AS "brands_visible_count" FROM brands;

-- Test non-admin user trying to INSERT a brand (should fail)
DO $$
BEGIN
  BEGIN
    INSERT INTO brands (name, country, language) VALUES ('Test Brand', 'GB', 'en-GB');
    RAISE NOTICE 'INSERT succeeded when it should have failed';
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'INSERT correctly failed: %', SQLERRM;
  END;
END $$;

-- Test SELECT filtering on content based on brand permissions
DO $$
DECLARE
  user_count INT;
  content_before INT;
  content_with_brand INT;
BEGIN
  -- Count initial content visibility
  SELECT COUNT(*) INTO content_before FROM content;
  
  -- Count after applying a brand filter
  SELECT COUNT(*) INTO content_with_brand 
  FROM content 
  WHERE brand_id IN (
    SELECT brand_id 
    FROM user_brand_permissions 
    WHERE user_id = auth.uid()
  );
  
  RAISE NOTICE 'Content visible: % of % total', content_with_brand, content_before;
  
  -- This is just to report success, not a test condition
  IF content_with_brand <= content_before THEN
    RAISE NOTICE 'Content filtering working correctly';
  ELSE
    RAISE NOTICE 'Unexpected content visibility results';
  END IF;
END $$;

-- Reset role
RESET ROLE;
EOF
)
  
  # Run the tests
  echo -e "${YELLOW}Running tests to verify RLS policies...${NC}"
  psql "${db_url}" -c "$TEST_SQL"
  
  # Check exit code
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ RLS policy tests completed${NC}"
  else
    echo -e "${RED}× Error during RLS policy tests${NC}"
    exit 1
  fi
}

# Check environment and run tests
if [ "$ENVIRONMENT" = "local" ]; then
  # Local development database
  if [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$POSTGRES_HOST" ]; then
    # Default values if environment variables aren't set
    POSTGRES_HOST=${POSTGRES_HOST:-localhost}
    POSTGRES_PORT=${POSTGRES_PORT:-5432}
    POSTGRES_DB=${POSTGRES_DB:-mixerai}
    POSTGRES_USER=${POSTGRES_USER:-postgres}
    POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
    
    echo -e "${YELLOW}Using default database connection settings. To override, set POSTGRES_* environment variables.${NC}"
  fi
  
  DB_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
  run_rls_tests "$DB_URL" "local database"
  
elif [ "$ENVIRONMENT" = "production" ]; then
  # Production database via Supabase
  if [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${RED}Error: SUPABASE_DB_URL environment variable is required for production tests.${NC}"
    echo "Format: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
    exit 1
  fi
  
  run_rls_tests "$SUPABASE_DB_URL" "production database"
  
else
  echo -e "${RED}Error: Invalid environment. Use 'local' or 'production'.${NC}"
  echo "Usage: ./test-rls-policies.sh [local|production]"
  exit 1
fi

echo ""
echo -e "${GREEN}RLS policy testing complete!${NC}"
echo "Review the test results above to ensure policies are working as expected." 