#!/bin/bash

# Script to deploy Row Level Security policies to either local or production database
# Usage: ./deploy-rls-policies.sh [local|production]

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default to local if no environment specified
ENVIRONMENT=${1:-local}

# Function to apply RLS policies to a database
apply_rls_policies() {
  local db_url=$1
  local db_name=$2
  
  echo -e "${YELLOW}Applying RLS policies to ${db_name}...${NC}"
  
  # Check if PSQL is available
  if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql command not found. Please install PostgreSQL client tools.${NC}"
    exit 1
  }
  
  # Apply the policies
  psql "${db_url}" -f migrations/auth-rls-policies.sql
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ RLS policies successfully applied to ${db_name}${NC}"
  else
    echo -e "${RED}× Failed to apply RLS policies to ${db_name}${NC}"
    exit 1
  fi
}

# Check environment and apply policies
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
  apply_rls_policies "$DB_URL" "local database"
  
elif [ "$ENVIRONMENT" = "production" ]; then
  # Production database via Supabase
  if [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${RED}Error: SUPABASE_DB_URL environment variable is required for production deployment.${NC}"
    echo "Format: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
    exit 1
  fi
  
  apply_rls_policies "$SUPABASE_DB_URL" "production database"
  
else
  echo -e "${RED}Error: Invalid environment. Use 'local' or 'production'.${NC}"
  echo "Usage: ./deploy-rls-policies.sh [local|production]"
  exit 1
fi

echo ""
echo -e "${GREEN}RLS policy deployment complete!${NC}"
echo "Remember to test your application with these new security policies." 