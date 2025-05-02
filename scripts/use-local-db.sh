#!/bin/bash

# Make script exit if any command fails
set -e

echo "Running MixerAI with local database configuration..."
echo "Temporarily using environment variables to override Supabase configuration..."

# Use environment variables to override the Supabase configuration
NEXT_PUBLIC_SUPABASE_URL="" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="" \
SUPABASE_SERVICE_ROLE_KEY="" \
DATABASE_URL="postgres://postgres:postgres@localhost:5432/mixerai" \
POSTGRES_HOST="localhost" \
POSTGRES_PORT="5432" \
POSTGRES_USER="postgres" \
POSTGRES_PASSWORD="postgres" \
POSTGRES_DB="mixerai" \
npm run dev 